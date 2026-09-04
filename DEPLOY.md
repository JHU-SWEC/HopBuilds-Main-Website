# Deploying to Vercel

The site is static files plus one serverless function, so Vercel hosts the
whole thing. The function lives at `api/scores.js` and is served at
`/api/scores` on the same origin as the page, which is why the frontend needs
no API host and no CORS configuration.

## One-time setup

1. Import the repository at [vercel.com/new](https://vercel.com/new). No
   framework preset is needed; Vercel reads `buildCommand` and
   `outputDirectory` from `vercel.json` (`vite build` / `dist`) automatically,
   and still compiles anything under `api/` independently of that output
   directory.
2. In Project Settings > Environment Variables, add `MONGODB_URI` with the
   Atlas connection string, password URL-encoded. Add it for Production,
   Preview, and Development so `vercel dev` works too.
3. In MongoDB Atlas > Network Access, allow Vercel to connect. Vercel functions
   do not have fixed outbound IPs on the Hobby plan, so this usually means
   allowing `0.0.0.0/0`. The database user's password is what actually guards
   the data, which is why it must never be committed.
4. Redeploy. `/api/scores` should return `[]` or the current board as JSON.
5. Node version: `package.json` pins `"engines": { "node": "22.x" }`, and
   Vercel's documented behavior is that `engines.node` always overrides
   whatever is set in Project Settings → General → Node.js Version — the
   dashboard dropdown is inert once `engines.node` is committed. Vite requires
   Node `^20.19.0 || >=22.12.0`, and this repo pins to `22.x` specifically so
   Vercel resolves to Node 22 rather than defaulting an open-ended range to
   its newest major; that pin, not any dashboard setting, is what controls the
   deployed Node version. If the dashboard dropdown shows something else,
   that's stale UI, not a real conflict — don't "fix" it there as routine
   guidance.

   One caveat: bumping `engines.node` alone doesn't reliably force Vercel to
   drop a cached build from before the bump (per
   [vercel/vercel#14368](https://github.com/vercel/vercel/issues/14368), a
   stale build cache can restore artifacts built on the previous Node major
   and the deploy can silently keep running old Node). If the first post-merge
   production build needs checking, look at the build log for which Node
   major it actually used, logged near the start of the build step. If it's
   stale, the pragmatic first attempt is Vercel's dashboard "Redeploy" action
   with "Use existing Build Cache" turned off — low-cost, but unconfirmed for
   this specific failure mode, so re-check the log after it runs rather than
   assuming it worked. If the log still shows the stale major after that, the
   one lever the linked issue does confirm is changing the dashboard Node.js
   Version dropdown itself, to force the cache-invalidation log line — a
   deliberate, last-resort exception to "don't touch the dashboard" above,
   reverted back afterward since `engines.node` is what should govern going
   forward.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in MONGODB_URI
npm run dev                  # http://localhost:8000
```

`npm run dev` is Vite's dev server (with HMR) doing the static/module serving,
extended by a small plugin (`scripts/vite-api-plugin.js`) that handles
`/api/scores` — same single command, same `http://localhost:8000` URL, so the
page calls the same same-origin `/api/scores` it uses in production. It needs
no Vercel account.

A plain `python3 -m http.server` will serve the page but every leaderboard
request 404s, because nothing is running the function — and it won't resolve
bare-specifier imports like `import gsap from "gsap"` either, since only
Vite's dev server does that.

`npm run build` produces the production bundle in `dist/`, and
`npm run preview` serves that build locally, for a pre-push sanity check of
the production bundle.

For a closer match to the production runtime, `npm run dev:vercel` uses
`vercel dev` instead, which requires the Vercel CLI and a login.

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
