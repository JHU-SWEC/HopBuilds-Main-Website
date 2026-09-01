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
 * ranking rather than a verified competition. The checks here keep casual
 * nonsense out; they do not stop someone determined with devtools open.
 */

import { getScores, getRateLimits } from "./_lib/db.js";
import {
  BOARD_LIMIT,
  SCORE_MAX,
  cleanName,
  cleanScore,
  cleanEmail,
} from "./_lib/validate.js";

const RATE_WINDOW_SECONDS = 300;
const RATE_MAX_POSTS = 10;

/** Vercel sits behind a proxy, so the client address arrives in a header. */
const clientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
};

/**
 * Per-IP limiter backed by Mongo, because serverless containers do not share
 * memory. A TTL index expires the rows, so nothing needs cleaning up.
 */
const rateLimited = async (ip) => {
  const limits = await getRateLimits();
  await limits.createIndex({ createdAt: 1 }, { expireAfterSeconds: RATE_WINDOW_SECONDS });

  const since = new Date(Date.now() - RATE_WINDOW_SECONDS * 1000);
  const recent = await limits.countDocuments({ ip, createdAt: { $gte: since } });
  if (recent >= RATE_MAX_POSTS) return true;

  await limits.insertOne({ ip, createdAt: new Date() });
  return false;
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
    return res.status(500).json({ error: "Leaderboard is unavailable right now." });
  }
}
