/**
 * Print the collected emails as CSV, newest first.
 *
 *   cd server && node export-emails.js > emails.csv
 *
 * Emails are never exposed through the public API, so this script is the way
 * to get at them. It reads the same MONGODB_URI as the server.
 */

import "dotenv/config";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "hopbuilds";
const collectionName = process.env.MONGODB_COLLECTION || "arcade_scores";

if (!uri) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}

/** Wrap a field so a comma or quote inside it cannot break the CSV. */
const csvCell = (value) => `"${String(value).replace(/"/g, '""')}"`;

const client = new MongoClient(uri);

try {
  await client.connect();
  const rows = await client
    .db(dbName)
    .collection(collectionName)
    .find({ email: { $exists: true, $ne: null } }, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .toArray();

  console.log("email,name,score,submitted");
  for (const row of rows) {
    console.log(
      [row.email, row.name, row.score, row.createdAt?.toISOString() ?? ""]
        .map(csvCell)
        .join(",")
    );
  }
  console.error(`${rows.length} address(es) exported.`);
} finally {
  await client.close();
}
