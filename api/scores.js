/**
 * Leaderboard endpoint for the homepage speed-math bonus round.
 *
 *   GET  /api/scores?limit=10   top scores, ties broken by who got there first
 *   POST /api/scores            body { name, score, email }
 *
 * The board holds one row per email address: a repeat submission updates that
 * player's single row rather than adding another, and the row keeps their
 * highest score. Email is therefore required, and is the identity the board is
 * keyed on — a name alone is neither unique nor stable.
 *
 * Emails are stored but never returned: the GET projection lists fields
 * explicitly so a new field can never leak by accident.
 *
 * Scores are calculated in the browser, so treat the board as a friendly
 * ranking rather than a verified competition. POST requires a session token
 * minted by POST /api/session and only claimable once a real round's worth
 * of time has passed (see claimSession below) -- this stops a bare console
 * POST with no session, but a scripted attacker who waits out the timer can
 * still submit a plausible-but-inflated score. It is a deterrent, not proof.
 */

import { getScores, getRateLimits, getSessions } from "./_lib/db.js";
import {
  BOARD_LIMIT,
  BOARD_MAX,
  SCORE_MAX,
  cleanName,
  cleanScore,
  cleanEmail,
} from "./_lib/validate.js";

const RATE_WINDOW_SECONDS = 300;
const RATE_MAX_POSTS = 10;

/* The drill is a fixed 30s round; require the token be at least this old
   before it can be redeemed, so a token can't be minted and immediately
   spent. Slightly under 30000 to leave room for real network/UI latency. */
const MIN_SESSION_AGE_MS = 27000;

/**
 * The rate-limit bucket key.
 *
 * Deliberately does NOT read `x-forwarded-for`. That header is a client-writable
 * request header, and its leftmost entry -- the conventional "original client"
 * slot -- is exactly the part an attacker controls. Keying the limiter on it let
 * a script rotate a fake address per request and post without any ceiling, which
 * turns two unauthenticated endpoints into unbounded row inserts against Atlas.
 *
 * `x-vercel-forwarded-for` is set by Vercel's proxy and overwritten on every
 * inbound request, so a client cannot forge it. When it is absent there is no
 * trusted proxy in front of us (the Vite dev server, a direct hit), and the
 * socket address is then the only honest answer -- so fall through to it rather
 * than believing a header. Behind some other reverse proxy this collapses every
 * caller into that proxy's single bucket; that fails closed, and adding a new
 * deployment target means adding its trusted header here explicitly.
 */
export const clientIp = (req) => {
  const vercel = req.headers["x-vercel-forwarded-for"];
  if (typeof vercel === "string" && vercel) return vercel.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
};

/**
 * Per-IP limiter backed by Mongo, because serverless containers do not share
 * memory. A TTL index expires the rows, so nothing needs cleaning up.
 */
export const rateLimited = async (ip) => {
  const limits = await getRateLimits();
  await limits.createIndex({ createdAt: 1 }, { expireAfterSeconds: RATE_WINDOW_SECONDS });

  const since = new Date(Date.now() - RATE_WINDOW_SECONDS * 1000);
  const recent = await limits.countDocuments({ ip, createdAt: { $gte: since } });
  if (recent >= RATE_MAX_POSTS) return true;

  await limits.insertOne({ ip, createdAt: new Date() });
  return false;
};

/**
 * Atomically redeems a session token: it must exist, be unused, and be old
 * enough to correspond to a real round. findOneAndUpdate is atomic, so two
 * concurrent requests for the same token cannot both succeed (no
 * read-then-write race). Returns true iff the token was successfully claimed.
 */
const claimSession = async (token) => {
  if (typeof token !== "string" || !token) return false;

  const sessions = await getSessions();
  const cutoff = new Date(Date.now() - MIN_SESSION_AGE_MS);
  const result = await sessions.findOneAndUpdate(
    { _id: token, used: false, createdAt: { $lte: cutoff } },
    { $set: { used: true, usedAt: new Date() } },
    /* Pinned explicitly: mongodb driver v6 returns the matched document
       directly (or null) by default, while older majors wrapped it as
       { value }. Setting this removes the ambiguity instead of guessing. */
    { includeResultMetadata: false }
  );
  return Boolean(result);
};

/**
 * Write this run into the player's single board row and return what the board
 * will show for them.
 *
 * A lower run never displaces a higher one, so `score` and `createdAt` move
 * only on a new personal best; `createdAt` breaks ties on the board, and
 * keeping the earlier one means a player who re-ties their own best does not
 * lose the position they already earned. The name always follows the latest
 * submission, so a typo can be corrected by playing again.
 *
 * Rows predating the one-per-email rule can leave several rows on one address;
 * the extras are folded into the best one the first time that player returns.
 */
const recordBest = async ({ scores, name, email, score }) => {
  const previous = await scores.find({ email }).sort({ score: -1, createdAt: 1 }).toArray();
  const champion = previous[0] || null;
  const isPersonalBest = !champion || score > champion.score;

  const entry = {
    name,
    score: isPersonalBest ? score : champion.score,
    createdAt: isPersonalBest ? new Date() : champion.createdAt,
  };

  if (!champion) {
    await scores.insertOne({ ...entry, email });
  } else {
    await scores.updateOne({ _id: champion._id }, { $set: { ...entry, email } });
    if (previous.length > 1) {
      await scores.deleteMany({ email, _id: { $ne: champion._id } });
    }
  }

  /* Best effort: the guarantee above is enforced in code, and this index only
     backs it up at the storage layer. It is created here rather than at deploy
     time because there is no migration step, and it throws while duplicate
     rows from before the rule still exist elsewhere in the collection — which
     must not fail an otherwise valid submission. The partial filter leaves any
     legacy row that has no email alone instead of collapsing them all into one
     "missing email" conflict. */
  try {
    await scores.createIndex(
      { email: 1 },
      { unique: true, partialFilterExpression: { email: { $type: "string" } } }
    );
  } catch (err) {
    /* Only the code, never the message: a duplicate-key error quotes the
       offending key back, which for this index is somebody's email address,
       and emails must not reach the logs. */
    console.warn("Could not create the unique email index. Mongo code:", err?.code);
  }

  return entry;
};

const handleGet = async (req, res) => {
  /* The board is one row per player, so "every entry" is a bounded set and the
     page can pull it in a single request and scroll it. BOARD_MAX is still a
     hard ceiling: an unbounded limit would let one request ask Atlas for the
     whole collection. */
  const requested = parseInt(req.query?.limit, 10);
  const limit = Math.min(Number.isInteger(requested) && requested > 0 ? requested : BOARD_LIMIT, BOARD_MAX);

  const scores = await getScores();
  const rows = await scores
    .find({}, { projection: { _id: 0, name: 1, score: 1, createdAt: 1 } })
    .sort({ score: -1, createdAt: 1 })
    .limit(limit)
    .toArray();

  /* The board is public and changes often; let a CDN hold it briefly. */
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=10");
  return res.status(200).json(rows);
};

const handlePost = async (req, res) => {
  const ip = clientIp(req);
  if (await rateLimited(ip)) {
    return res.status(429).json({ error: "Too many submissions. Try again in a few minutes." });
  }

  /* Vercel parses JSON bodies, but a stringified body can still arrive. */
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (err) {
      return res.status(400).json({ error: "Malformed request." });
    }
  }

  const name = cleanName(body?.name);
  const score = cleanScore(body?.score);
  const email = cleanEmail(body?.email);

  if (!name) return res.status(400).json({ error: "Name is required." });
  if (score === null) {
    return res.status(400).json({ error: `Score must be a whole number from 0 to ${SCORE_MAX}.` });
  }
  if (email === "invalid") {
    return res.status(400).json({ error: "That email address does not look right." });
  }
  if (!email) return res.status(400).json({ error: "Email is required." });

  /* Claimed after validation, never before: claiming consumes the token, and a
     fixable mistake in the form should not cost the player the round they just
     played. Nothing above this line touches the database or has side effects. */
  if (!(await claimSession(body?.token))) {
    return res.status(400).json({ error: "Session expired or invalid. Play another round to submit a score." });
  }

  const scores = await getScores();
  const entry = await recordBest({ scores, name, email, score });

  const rank = (await scores.countDocuments({ score: { $gt: entry.score } })) + 1;
  return res.status(201).json({ ...entry, rank });
};

export default async function handler(req, res) {
  try {
    if (req.method === "GET") return await handleGet(req, res);
    if (req.method === "POST") return await handlePost(req, res);
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    console.error(`${req.method} /api/scores failed:`, err);

    /* Configuration mistakes are worth naming: they are the difference between
       "the club needs to fix a setting" and "the database is down". The text
       describes the deployment, never the credentials themselves. */
    const message = /MONGODB_URI is not set/.test(err?.message)
      ? "Leaderboard is not configured: MONGODB_URI is missing."
      : "Leaderboard is unavailable right now.";

    return res.status(500).json({ error: message });
  }
}
