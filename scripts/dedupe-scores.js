/**
 * One-time cleanup for leaderboard rows created before the board enforced one
 * entry per player.
 *
 *   node scripts/dedupe-scores.js            # report only, changes nothing
 *   node scripts/dedupe-scores.js --apply    # collapse the duplicates
 *
 * `api/scores.js` keeps one row per email from now on, but it can only fold a
 * player's old rows together the next time that player submits, and rows
 * predating the email requirement have no address to group by at all. This
 * script does the backfill in one pass.
 *
 * Grouping: by email when the row has one, otherwise by case-folded name. The
 * name fallback is the whole reason this is a script you run deliberately
 * rather than something the API does on its own — two different people can
 * share a name, and only a human looking at the report can judge that. Run it
 * without --apply first and read the groups it lists.
 *
 * Each group keeps its highest score, and the earliest row at that score, so
 * nobody's position moves except by losing the duplicates below it.
 *
 * Emails are never printed: groups are labelled by name, and an email-keyed
 * group is shown as the name on the row being kept. It reads MONGODB_URI from
 * .env.local, like scripts/export-emails.js.
 */

import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config({ path: ".env.local" });
dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "hopbuilds";
const collectionName = process.env.MONGODB_COLLECTION || "arcade_scores";
const apply = process.argv.includes("--apply");

if (!uri) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}

/** Email when there is one, otherwise the case-folded name. */
const groupKey = (row) =>
  typeof row.email === "string" && row.email
    ? `email:${row.email}`
    : `name:${String(row.name || "").toLowerCase()}`;

const client = new MongoClient(uri);

try {
  await client.connect();
  const scores = client.db(dbName).collection(collectionName);

  /* Highest first, then earliest: the first row of a group is the keeper. */
  const rows = await scores.find({}).sort({ score: -1, createdAt: 1 }).toArray();

  const groups = new Map();
  for (const row of rows) {
    const key = groupKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const duplicated = [...groups.values()].filter((group) => group.length > 1);

  if (!duplicated.length) {
    console.log(`${rows.length} row(s), no duplicates. Nothing to do.`);
  } else {
    for (const group of duplicated) {
      const [keep, ...drop] = group;
      const scoresDropped = drop.map((row) => row.score).join(", ");
      console.log(
        `${keep.name}: keeping ${keep.score}, dropping ${drop.length} row(s) [${scoresDropped}]`
      );
    }

    const dropCount = duplicated.reduce((total, group) => total + group.length - 1, 0);

    if (!apply) {
      console.log(`\n${dropCount} row(s) would be removed. Re-run with --apply to do it.`);
    } else {
      const ids = duplicated.flatMap((group) => group.slice(1).map((row) => row._id));
      const result = await scores.deleteMany({ _id: { $in: ids } });
      console.log(`\n${result.deletedCount} row(s) removed.`);
    }
  }

  /* Only worth attempting once the duplicates are gone; before that it throws.
     Same index api/scores.js creates, so this is belt-and-braces, not a
     requirement. Logs the code rather than the message: a duplicate-key error
     quotes the offending key, which here would be somebody's email. */
  if (apply) {
    try {
      await scores.createIndex(
        { email: 1 },
        { unique: true, partialFilterExpression: { email: { $type: "string" } } }
      );
      console.log("Unique email index is in place.");
    } catch (err) {
      console.error("Could not create the unique email index. Mongo code:", err?.code);
    }
  }
} finally {
  await client.close();
}
