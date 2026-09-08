/**
 * Leaderboard endpoint for the homepage speed-math bonus round.
 *
 *   GET  /api/scores?limit=10   top scores, ties broken by who got there first
 *   POST /api/scores            body { name, score, email? }
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

/** Vercel sits behind a proxy, so the client address arrives in a header. */
export const clientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
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

const handleGet = async (req, res) => {
  const requested = parseInt(req.query?.limit, 10);
  const limit = Math.min(Number.isInteger(requested) && requested > 0 ? requested : BOARD_LIMIT, 50);

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

  if (!(await claimSession(body?.token))) {
    return res.status(400).json({ error: "Session expired or invalid. Play another round to submit a score." });
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

  const entry = { name, score, createdAt: new Date() };
  const scores = await getScores();
  await scores.insertOne(email ? { ...entry, email } : { ...entry });

  const rank = (await scores.countDocuments({ score: { $gt: score } })) + 1;
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
