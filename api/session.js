/**
 * Issues a one-time play-session token for the speed-math drill.
 *
 *   POST /api/session   ->  { token, problems: [{ a, b, op }] }
 *
 * The session is the round: it carries the problems the player will be asked,
 * generated here so POST /api/scores can re-grade the run instead of trusting
 * a score the browser reports (see api/_lib/drill.js). Its creation time also
 * proves a round of roughly the drill's real length elapsed before a score was
 * submitted. See api/scores.js for how it's redeemed and consumed. A TTL index expires
 * abandoned tokens so nothing needs manual cleanup.
 */

import { getSessions } from "./_lib/db.js";
import { clientIp, rateLimited } from "./scores.js";
import { generateProblems, SESSION_TTL_SECONDS } from "./_lib/drill.js";
import crypto from "node:crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const ip = clientIp(req);
  if (await rateLimited(ip)) {
    return res.status(429).json({ error: "Too many sessions started. Try again in a few minutes." });
  }

  try {
    const sessions = await getSessions();
    await sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: SESSION_TTL_SECONDS });

    const token = crypto.randomBytes(24).toString("hex");
    const problems = generateProblems();
    await sessions.insertOne({ _id: token, createdAt: new Date(), used: false, problems });

    res.setHeader("Cache-Control", "no-store");
    return res.status(201).json({ token, problems });
  } catch (err) {
    console.error("POST /api/session failed:", err);
    const message = /MONGODB_URI is not set/.test(err?.message)
      ? "Leaderboard is not configured: MONGODB_URI is missing."
      : "Could not start a session.";
    return res.status(500).json({ error: message });
  }
}
