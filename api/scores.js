/**
 * Leaderboard endpoint for the homepage speed-math bonus round.
 *
 *   GET  /api/scores?limit=10   top scores, ties broken by who got there first
 *   POST /api/scores            body { name, email, token, answers: [{ value, t }], ownerKey? }
 *
 * The board holds one row per email address: a repeat submission updates that
 * player's single row rather than adding another, and the row keeps their
 * highest score. Email is therefore required, and is the identity the board is
 * keyed on — a name alone is neither unique nor stable.
 *
 * Emails are stored but never returned: the GET projection lists fields
 * explicitly so a new field can never leak by accident.
 *
 * A row belongs to the browser that first saved it. Nothing proves who owns an
 * email address, so without this anyone could post under someone else's email
 * and rename their row. The first save issues an owner key (kept in that
 * browser's localStorage, stored here only as a SHA-256 hash); later saves for
 * the same email must present it. The cost: a player on a new device, or one
 * who cleared site data, cannot update their row from there. Rows that predate
 * this have no key yet and are claimed by whoever next saves under that email.
 *
 * The score is graded here, never taken from the browser. POST requires a
 * session token minted by POST /api/session, which also generated and stored
 * the round's problems; the browser submits what it typed for each problem and
 * when, and gradeRun (api/_lib/drill.js) recomputes the score from that. Any
 * `score` field in the body is ignored. The token is only claimable once a
 * real round's worth of time has passed (see claimSession below).
 *
 * What this does not stop: a script that plays the served problems itself.
 * The browser has to know the answers to advance instantly, so a solver bot
 * can still post a perfect, correctly-paced round. Timing checks bound it.
 */

import crypto from "node:crypto";
import { getScores, getRateLimits, getSessions } from "./_lib/db.js";
import {
  BOARD_LIMIT,
  BOARD_MAX,
  cleanName,
  isOffensiveName,
  cleanEmail,
} from "./_lib/validate.js";
import { gradeRun, SESSION_TTL_SECONDS } from "./_lib/drill.js";

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
 * Atomically redeems a session token: it must exist, be unused, be old enough
 * to correspond to a real round, and not be past its TTL (Mongo's TTL monitor
 * only sweeps about once a minute, so an expired row can briefly linger).
 * findOneAndUpdate is atomic, so two concurrent requests for the same token
 * cannot both succeed (no read-then-write race). Returns the session document
 * -- which carries the round's problems -- or null if it could not be claimed.
 */
const claimSession = async (token) => {
  if (typeof token !== "string" || !token) return null;

  const sessions = await getSessions();
  const now = Date.now();
  const result = await sessions.findOneAndUpdate(
    {
      _id: token,
      used: false,
      createdAt: {
        $lte: new Date(now - MIN_SESSION_AGE_MS),
        $gt: new Date(now - SESSION_TTL_SECONDS * 1000),
      },
    },
    { $set: { used: true, usedAt: new Date() } },
    /* Pinned explicitly: mongodb driver v6 returns the matched document
       directly (or null) by default, while older majors wrapped it as
       { value }. Setting this removes the ambiguity instead of guessing. */
    { includeResultMetadata: false }
  );
  return result || null;
};

/* 24 random bytes as hex, the same shape as a session token. */
const OWNER_KEY_PATTERN = /^[0-9a-f]{48}$/;

const hashOwnerKey = (key) => crypto.createHash("sha256").update(key).digest("hex");

/* Constant-time, so response timing cannot be used to guess a key byte by byte. */
const ownerKeyMatches = (key, storedHash) => {
  if (typeof key !== "string" || !OWNER_KEY_PATTERN.test(key)) return false;
  const given = Buffer.from(hashOwnerKey(key), "hex");
  const stored = Buffer.from(String(storedHash), "hex");
  return given.length === stored.length && crypto.timingSafeEqual(given, stored);
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
const recordBest = async ({ scores, previous, name, email, score, ownerKeyHash }) => {
  const champion = previous[0] || null;
  const isPersonalBest = !champion || score > champion.score;

  const entry = {
    name,
    score: isPersonalBest ? score : champion.score,
    createdAt: isPersonalBest ? new Date() : champion.createdAt,
  };

  if (!champion) {
    await scores.insertOne({ ...entry, email, ownerKeyHash });
  } else {
    await scores.updateOne({ _id: champion._id }, { $set: { ...entry, email, ownerKeyHash } });
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
  const email = cleanEmail(body?.email);

  if (!name) return res.status(400).json({ error: "Name is required." });
  if (isOffensiveName(name)) {
    return res.status(400).json({ error: "That name is not allowed on the board. Please pick another." });
  }
  if (email === "invalid") {
    return res.status(400).json({ error: "That email address does not look right." });
  }
  if (!email) return res.status(400).json({ error: "Email is required." });

  /* Ownership is checked before the session is claimed, so a player who hits
     this on a second device has not spent anything by trying. The message
     deliberately does not repeat the address back. */
  const scores = await getScores();
  const previous = await scores.find({ email }).sort({ score: -1, createdAt: 1 }).toArray();
  const owned = previous.find((row) => typeof row.ownerKeyHash === "string");
  if (owned && !ownerKeyMatches(body?.ownerKey, owned.ownerKeyHash)) {
    return res.status(403).json({
      error: "That email is already on the board from another browser. Save from that browser, or use a different email.",
    });
  }

  /* A browser keeps one key for every email it saves under. Reuse the one it
     sent when it is well formed, otherwise issue a fresh one. */
  const ownerKey =
    typeof body?.ownerKey === "string" && OWNER_KEY_PATTERN.test(body.ownerKey)
      ? body.ownerKey
      : crypto.randomBytes(24).toString("hex");

  /* Claimed after validation and the ownership check, never before: claiming
     consumes the token, and a fixable mistake in the form should not cost the
     player the round they just played. Nothing above this line writes to the
     database except the rate limiter. */
  const session = await claimSession(body?.token);
  if (!session) {
    return res.status(400).json({ error: "Session expired or invalid. Play another round to submit a score." });
  }

  /* Graded after the claim, so a rejected run still burns its token and the
     same problems cannot be retried with adjusted answers or timings. */
  const graded = gradeRun({
    problems: session.problems,
    answers: body?.answers,
    elapsedMs: Date.now() - new Date(session.createdAt).getTime(),
  });
  if (graded.error) {
    return res.status(400).json({ error: "That run could not be verified. Play another round to submit a score." });
  }
  const score = graded.score;

  const entry = await recordBest({ scores, previous, name, email, score, ownerKeyHash: hashOwnerKey(ownerKey) });

  const rank = (await scores.countDocuments({ score: { $gt: entry.score } })) + 1;
  return res.status(201).json({ ...entry, rank, ownerKey });
};

export default async function handler(req, res) {
  try {
    if (req.method === "GET") return await handleGet(req, res);
    if (req.method === "POST") return await handlePost(req, res);
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    /* A Mongo error's message can quote a document key back -- a duplicate
       key on the unique email index names the address -- and emails must not
       reach the logs. Log only the driver's name and code for those. */
    const loggable = /^Mongo/.test(err?.name || "") ? { name: err.name, code: err.code } : err;
    console.error(`${req.method} /api/scores failed:`, loggable);

    /* Configuration mistakes are worth naming: they are the difference between
       "the club needs to fix a setting" and "the database is down". The text
       describes the deployment, never the credentials themselves. */
    const message = /MONGODB_URI is not set/.test(err?.message)
      ? "Leaderboard is not configured: MONGODB_URI is missing."
      : "Leaderboard is unavailable right now.";

    return res.status(500).json({ error: message });
  }
}
