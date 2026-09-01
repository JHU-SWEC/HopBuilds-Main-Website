/**
 * MongoDB access for the Vercel serverless functions.
 *
 * Serverless invocations reuse a warm container, so the client is cached on
 * globalThis. Without this every request would open a new connection pool and
 * Atlas would start refusing connections under any real traffic.
 */

import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "hopbuilds";

if (!uri) {
  throw new Error("MONGODB_URI is not set. Add it in the Vercel project settings.");
}

/* Reuse across invocations, and across hot reloads in `vercel dev`. */
let cached = globalThis._hopbuildsMongo;
if (!cached) {
  cached = globalThis._hopbuildsMongo = { promise: null };
}

const getClient = () => {
  if (!cached.promise) {
    cached.promise = new MongoClient(uri).connect().catch((err) => {
      /* Clear the cache so the next invocation retries instead of reusing a
         permanently rejected promise. */
      cached.promise = null;
      throw err;
    });
  }
  return cached.promise;
};

export const getDb = async () => {
  const client = await getClient();
  return client.db(dbName);
};

export const getScores = async () => {
  const db = await getDb();
  return db.collection(process.env.MONGODB_COLLECTION || "arcade_scores");
};

export const getRateLimits = async () => {
  const db = await getDb();
  return db.collection("arcade_rate_limits");
};
