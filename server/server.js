/**
 * HopBuilds arcade leaderboard API.
 *
 * Two endpoints back the speed-math bonus round on the homepage:
 *   GET  /api/scores        top scores, newest first on ties
 *   POST /api/scores        submit { name, score }
 *
 * Scores are reported by the browser, so treat the board as a friendly
 * ranking rather than a verified competition. The limits below exist to keep
 * casual abuse out, not to make cheating impossible.
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "hopbuilds";
const COLLECTION = process.env.MONGODB_COLLECTION || "arcade_scores";

/* Comma-separated list, e.g. "https://jhu-swec.github.io,http://localhost:8000" */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const NAME_MAX = 16;
const EMAIL_MAX = 254; /* RFC 5321 upper bound on a full address */
const SCORE_MAX = 500; /* a 30-second run realistically tops out near 100 */
const BOARD_LIMIT = 10;
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX_POSTS = 10;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const app = express();
app.set("trust proxy", 1); /* hosts like Render sit behind a proxy */
app.use(express.json({ limit: "4kb" }));
app.use(
  cors({
    origin(origin, callback) {
      /* no Origin header: curl, same-origin, health checks */
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.length === 0) return callback(null, true);
      return callback(null, ALLOWED_ORIGINS.includes(origin));
    },
  })
);

const client = new MongoClient(MONGODB_URI);
let scores;

/* ---------- validation ---------- */

/** Strip control characters and collapse whitespace, then cap the length. */
const cleanName = (value) => {
  if (typeof value !== "string") return null;
  const stripped = value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return null;
  return stripped.slice(0, NAME_MAX);
};

/**
 * Email is optional. Returns the normalized address, null when absent, or
 * the string "invalid" so the caller can tell "not given" from "given badly".
 */
const cleanEmail = (value) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed.length > EMAIL_MAX) return "invalid";
  /* deliberately permissive: one @, no spaces, a dot in the domain */
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(trimmed)) return "invalid";
  return trimmed;
};

const cleanScore = (value) => {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 0 || value > SCORE_MAX) return null;
  return value;
};

/* ---------- rate limiting ---------- */

/**
 * In-memory per-IP limiter. Resets on restart and is per-instance, which is
 * fine at club scale. Move to Mongo or Redis if this ever runs multi-instance.
 */
const hits = new Map();

const rateLimited = (ip) => {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX_POSTS) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
};

/* Drop stale entries so the map cannot grow without bound. */
setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of hits) {
    const recent = times.filter((t) => now - t < RATE_WINDOW_MS);
    if (recent.length) hits.set(ip, recent);
    else hits.delete(ip);
  }
}, RATE_WINDOW_MS).unref();

/* ---------- routes ---------- */

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/scores", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || BOARD_LIMIT, 50);
  try {
    const rows = await scores
      .find({}, { projection: { _id: 0, name: 1, score: 1, createdAt: 1 } })
      .sort({ score: -1, createdAt: 1 })
      .limit(limit)
      .toArray();
    res.json(rows);
  } catch (err) {
    console.error("GET /api/scores failed:", err);
    res.status(500).json({ error: "Could not load scores." });
  }
});

app.post("/api/scores", async (req, res) => {
  const ip = req.ip || "unknown";
  if (rateLimited(ip)) {
    return res.status(429).json({ error: "Too many submissions. Try again in a few minutes." });
  }

  const name = cleanName(req.body?.name);
  const score = cleanScore(req.body?.score);
  const email = cleanEmail(req.body?.email);

  if (!name) return res.status(400).json({ error: "Name is required." });
  if (score === null) {
    return res.status(400).json({ error: `Score must be a whole number from 0 to ${SCORE_MAX}.` });
  }
  if (email === "invalid") {
    return res.status(400).json({ error: "That email address does not look right." });
  }

  const entry = { name, score, createdAt: new Date() };
  /* stored alongside the score but never served back out: see the GET
     projection below, which lists fields explicitly for exactly this reason */
  const doc = email ? { ...entry, email } : { ...entry };

  try {
    await scores.insertOne(doc);
    const rank = (await scores.countDocuments({ score: { $gt: score } })) + 1;
    res.status(201).json({ ...entry, rank });
  } catch (err) {
    console.error("POST /api/scores failed:", err);
    res.status(500).json({ error: "Could not save score." });
  }
});

/* ---------- boot ---------- */

const start = async () => {
  await client.connect();
  scores = client.db(DB_NAME).collection(COLLECTION);
  await scores.createIndex({ score: -1, createdAt: 1 });
  app.listen(PORT, () => {
    console.log(`Arcade leaderboard API listening on http://localhost:${PORT}`);
  });
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
