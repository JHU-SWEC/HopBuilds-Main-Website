# Deploying to Vercel

The site is static files plus one serverless function, so Vercel hosts the
whole thing. The function lives at `api/scores.js` and is served at
`/api/scores` on the same origin as the page, which is why the frontend needs
no API host and no CORS configuration.

## One-time setup

1. Import the repository at [vercel.com/new](https://vercel.com/new). No build
   command or framework preset is needed; the defaults serve `index.html` and
   compile anything under `api/`.
2. In Project Settings > Environment Variables, add `MONGODB_URI` with the
   Atlas connection string, password URL-encoded. Add it for Production,
   Preview, and Development so `vercel dev` works too.
3. In MongoDB Atlas > Network Access, allow Vercel to connect. Vercel functions
   do not have fixed outbound IPs on the Hobby plan, so this usually means
   allowing `0.0.0.0/0`. The database user's password is what actually guards
   the data, which is why it must never be committed.
4. Redeploy. `/api/scores` should return `[]` or the current board as JSON.

## Local development

```bash
npm install
npm i -g vercel        # once
cp .env.example .env.local   # then fill in MONGODB_URI
vercel dev
```

`vercel dev` serves the page and the function together on one port, matching
production. A plain `python3 -m http.server` will serve the page but every
leaderboard request will 404, because nothing is running the function.

## Environment variables

| Variable             | Purpose                                      |
| -------------------- | -------------------------------------------- |
| `MONGODB_URI`        | Atlas connection string, password URL-encoded |
| `MONGODB_DB`         | Database name, defaults to `hopbuilds`        |
| `MONGODB_COLLECTION` | Collection name, defaults to `arcade_scores`  |

## Collected emails

Emails submitted with a score are stored on the score document but never
returned by the API. To read them:

```bash
node scripts/export-emails.js > emails.csv
```

## Notes

- Rate limiting is stored in Mongo, not in memory, because serverless
  containers do not share state. A TTL index expires the rows automatically.
- The Mongo client is cached on `globalThis` so warm invocations reuse one
  connection pool instead of exhausting Atlas connection limits.
- Scores are computed in the browser, so the board is a friendly ranking rather
  than a verified competition. Making it tamper-proof would mean having the
  server generate the problems and grade the answers.
