/**
 * End-to-end checks for the one-row-per-player rule in api/scores.js.
 *
 *   npm run test-leaderboard:serve   # in one terminal
 *   npm run test-leaderboard          # in another
 *
 * Both commands set the same three throwaway collection names, so the run
 * touches no production data: not the board, not the session tokens, and not
 * the rate-limit budget real players share. All three are dropped at the end.
 *
 * If you set the names by hand, both commands need the SAME values. The guard
 * below refuses to run against the production names, but it can only see its
 * own environment — if the dev server was started against different
 * collections, the checks fail rather than pass quietly, because the rows they
 * look for will not be there.
 *
 * The run takes about a minute: api/scores.js will not redeem a session token
 * until roughly a real round has elapsed, so each phase mints its tokens up
 * front and waits once.
 *
 * There is no test framework in this repo; this is a plain script that exits
 * non-zero if any check fails.
 */

import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config({ path: ".env.local" });
dotenv.config();

const BASE = process.env.TEST_BASE_URL || "http://localhost:8001";
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "hopbuilds";
const collectionName = process.env.MONGODB_COLLECTION;
const sessionCollection = process.env.MONGODB_SESSION_COLLECTION;
const rateLimitCollection = process.env.MONGODB_RATE_LIMIT_COLLECTION;

if (!uri) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}
const production = {
  MONGODB_COLLECTION: "arcade_scores",
  MONGODB_SESSION_COLLECTION: "arcade_sessions",
  MONGODB_RATE_LIMIT_COLLECTION: "arcade_rate_limits",
};
for (const [variable, live] of Object.entries(production)) {
  const value = process.env[variable];
  if (!value || value === live) {
    console.error(
      `Set ${variable} to a throwaway collection (not \`${live}\`).\n` +
        "This script writes to, and then drops, whatever collections it is pointed at.\n" +
        "Use `npm run test-leaderboard:serve` and `npm run test-leaderboard`, which set all three."
    );
    process.exit(1);
  }
}

/* Long enough to clear MIN_SESSION_AGE_MS in api/scores.js, plus a margin. */
const TOKEN_WAIT_MS = 28000;

let failures = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) console.log(`      expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
};

const post = (path, body) =>
  fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  }).then(async (res) => ({ status: res.status, body: await res.json() }));

const mintToken = async () => {
  const res = await post("/api/session");
  if (!res.body?.token) throw new Error(`could not mint a session token: ${JSON.stringify(res)}`);
  return res.body.token;
};

const board = () => fetch(`${BASE}/api/scores?limit=50`).then((res) => res.json());
const named = async (name) => (await board()).filter((row) => row.name === name);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);
  const scores = db.collection(collectionName);

  /* The endpoints allow 10 posts per IP per 5 minutes and this run needs nine,
     which would leave it one retry from flaking. Clearing the throwaway bucket
     between phases keeps the limiter's real behavior intact while testing the
     leaderboard rule rather than the limiter. */
  const clearRateLimit = () => db.collection(rateLimitCollection).deleteMany({});

  /* Fail loudly rather than scribbling into a collection someone else owns. */
  if ((await scores.countDocuments()) > 0) {
    console.error(`${collectionName} is not empty. Point this at a fresh collection.`);
    process.exit(1);
  }

  await fetch(`${BASE}/api/scores?limit=1`).catch(() => {
    console.error(`No API at ${BASE}. Start the dev server first (see the header of this file).`);
    process.exit(1);
  });

  /* ---------- a returning player keeps one row, holding their best ---------- */

  const EMAIL = "repeat@example.test";
  await clearRateLimit();
  const tokens = [await mintToken(), await mintToken(), await mintToken()];
  console.log(`minted 3 session tokens, waiting ${TOKEN_WAIT_MS / 1000}s for them to become claimable...`);
  await wait(TOKEN_WAIT_MS);

  const first = await post("/api/scores", { name: "Runner One", score: 10, email: EMAIL, token: tokens[0] });
  check("first submission accepted", first.status, 201);
  check("first submission stores its score", first.body.score, 10);
  check("one row on the board", (await named("Runner One")).length, 1);

  const higher = await post("/api/scores", { name: "Runner Two", score: 25, email: EMAIL, token: tokens[1] });
  check("a better run is accepted", higher.status, 201);
  check("a better run replaces the old score", higher.body.score, 25);
  check("the name follows the latest submission", higher.body.name, "Runner Two");
  check("the old row is gone, not duplicated", (await named("Runner One")).length, 0);
  check("still exactly one row", (await named("Runner Two")).length, 1);

  const lower = await post("/api/scores", { name: "Runner Two", score: 5, email: EMAIL, token: tokens[2] });
  check("a weaker run is accepted", lower.status, 201);
  check("a weaker run does not displace the best", lower.body.score, 25);
  check("still exactly one row after a weaker run", (await named("Runner Two")).length, 1);
  check("the board still shows the best score", (await named("Runner Two"))[0].score, 25);

  /* ---------- email is required, and never comes back out ---------- */

  const noEmail = await post("/api/scores", { name: "No Email", score: 9 });
  check("a submission without an email is rejected", noEmail.status, 400);
  check("the rejection names the missing field", noEmail.body.error, "Email is required.");

  check(
    "GET never exposes an email",
    Object.keys((await named("Runner Two"))[0]).sort(),
    ["createdAt", "name", "score"]
  );

  /* ---------- rows predating the rule fold together on the next run ---------- */

  const LEGACY = "legacy@example.test";
  await scores.dropIndex("email_1").catch(() => {
    /* not created yet on a fresh collection, or already gone */
  });
  await scores.insertMany([
    { name: "Legacy", score: 12, email: LEGACY, createdAt: new Date("2025-01-01") },
    { name: "Legacy", score: 30, email: LEGACY, createdAt: new Date("2025-01-02") },
    { name: "Legacy", score: 7, email: LEGACY, createdAt: new Date("2025-01-03") },
  ]);
  check("seeded the pre-rule duplicates", (await named("Legacy")).length, 3);

  await clearRateLimit();
  const legacyToken = await mintToken();
  console.log(`waiting ${TOKEN_WAIT_MS / 1000}s for the token to become claimable...`);
  await wait(TOKEN_WAIT_MS);

  const fold = await post("/api/scores", { name: "Legacy", score: 4, email: LEGACY, token: legacyToken });
  check("the returning player's submission is accepted", fold.status, 201);
  check("their best old score survives a weaker new run", fold.body.score, 30);
  check("their duplicates collapsed to one row", (await named("Legacy")).length, 1);
  check("the surviving row shows the best score", (await named("Legacy"))[0].score, 30);

  /* ---------- the index backs the rule at the storage layer ---------- */

  const index = (await scores.indexes()).find((entry) => entry.name === "email_1");
  check("a unique email index exists", Boolean(index?.unique), true);
  check("it is partial, so emailless rows do not collide", Boolean(index?.partialFilterExpression), true);

  let blocked = false;
  try {
    await scores.insertOne({ name: "Legacy", score: 1, email: LEGACY, createdAt: new Date() });
  } catch (err) {
    blocked = err?.code === 11000;
  }
  check("the database itself refuses a second row for one email", blocked, true);

  /* Three rows with no email must all be allowed: the partial filter is what
     keeps them from colliding on a shared "missing email" key. */
  await scores.insertMany([
    { name: "NoEmail", score: 22, createdAt: new Date("2025-02-01") },
    { name: "NoEmail", score: 15, createdAt: new Date("2025-02-02") },
    { name: "NoEmail", score: 9, createdAt: new Date("2025-02-03") },
  ]);
  check("emailless rows are left alone by the index", (await named("NoEmail")).length, 3);
} finally {
  for (const name of [collectionName, sessionCollection, rateLimitCollection]) {
    await client
      .db(dbName)
      .collection(name)
      .drop()
      .catch(() => {
        /* never created, or already gone */
      });
  }
  await client.close();
}

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
