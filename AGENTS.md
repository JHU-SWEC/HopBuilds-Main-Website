# AGENTS.md

## Project overview

HopBuilds Main Website is the static marketing/recruiting homepage for
HopBuilds, JHU's student software engineering club, live at
https://hopbuilds.org/. It's a single HTML page plus one Vercel serverless
function (`api/scores.js`) backing a MongoDB-stored leaderboard for a
speed-math arcade game embedded on the page. There is currently no build step
and no frontend framework.

## Setup / build / test

```bash
npm install
cp .env.example .env.local   # then fill in MONGODB_URI
npm run dev                  # http://localhost:8000
```

- `npm run dev` — starts `scripts/dev-server.js`, which serves the static site
  and dispatches `/api/scores` to `api/scores.js` on the same port.
- `npm run dev:vercel` — `vercel dev`, closer to the production runtime; needs
  the Vercel CLI and a login.
- `npm run export-emails` — `node scripts/export-emails.js`, dumps leaderboard
  emails to CSV.
- There is no lint/test/build command in `package.json`. There is no build
  step: what's in the repo is what's served.
- Env vars: `MONGODB_URI` (required), `MONGODB_DB` (defaults `hopbuilds`),
  `MONGODB_COLLECTION` (defaults `arcade_scores`). See `.env.example` and
  `DEPLOY.md`.

## Code conventions

- Vanilla JS, no framework, no build step, no bundler.
- `js/home.js` is a single IIFE. GSAP, ScrollTrigger, and Lenis are loaded as
  classic `<script>` tags (`index.html:482-485`) and used as globals
  (`gsap`, `ScrollTrigger`, `Lenis`) — they are not ES module imports, and
  `js/home.js` is not an ES module.
- CSS uses flat kebab-case class names (e.g. `.arcade-board-list`,
  `.hero-terminal`), not BEM.
- Theming goes through CSS custom properties defined on `:root` in
  `css/home/redesign.css` (`--ink`, `--spirit`, `--slate`, etc.).
- DOM nodes carrying user- or player-supplied data are built with
  `document.createElement` + `.textContent`, never `innerHTML`. This is
  deliberate, not incidental: see `js/home.js:196-220` (`renderBoard`, which
  writes leaderboard names) and the API response shaping in `api/scores.js`.
  Do not introduce `innerHTML` for anything that touches player-supplied
  strings.

## Security rules

- Never commit `.env` or `.env.local`. `.env.example` holds placeholders
  only — never put a real connection string in it.
- In production, MongoDB credentials live in the Vercel dashboard
  (Project Settings → Environment Variables), not in a committed file.
- Never log or return the `email` field from `api/scores.js`. The GET
  projection (`api/scores.js:56`) lists fields explicitly (`name`, `score`,
  `createdAt`) so a new field can't leak by accident — keep that pattern if
  you touch the projection.

## Known gotchas — do not "fix" without being asked

- `js/vendor/*.min.js` (GSAP, ScrollTrigger, Lenis) are vendored dependencies,
  not source. Do not edit them.
- `project.html` is orphaned: its only inbound reference anywhere in the repo
  is `content/data.js:8` (`url: "./project.html"`), and `content/data.js` is
  never loaded by any page. It's slated for deletion in the planned Vite
  migration, not this repo's current state.
- `content/data.js` (113 lines) is dead code, loaded by nothing.
- **Known, unfixed accessibility bug:** desktop users with
  `prefers-reduced-motion` cannot reach build cards 2-4 in the "What We
  Build" section. Root cause (all three pieces present today):
  `js/home.js:472` (`if (reduceMotion) return;`) returns before the
  horizontal-scroll GSAP tween is ever set up; `css/home/redesign.css:529`
  sets `.builds { overflow: hidden }`; and the `overflow-x: auto` fallback at
  `css/home/redesign.css:690-693` is scoped to `max-width: 767px` only, so it
  never applies on desktop. A fix is planned in the migration doc — don't
  patch this ad hoc unless asked.
- The hero terminal is `display: none` below 1024px
  (`css/home/redesign.css:391-393`), but `initTerminal()` still runs
  underneath it. Known, deliberately deferred.
- Scores are computed client-side (`js/home.js`) and trusted by the server.
  This is a documented, accepted limitation (see `DEPLOY.md`), not a bug to
  fix.
- The local dev server (`scripts/dev-server.js`) never sets
  `x-forwarded-for`, so `clientIp()` (`api/scores.js:28-32`) resolves every
  local request to the same rate-limit bucket. Expected locally; only matters
  behind Vercel's proxy in production.

## Planned migration

A Vite migration (real npm dependencies for GSAP/ScrollTrigger/Lenis, an ES
module split of `js/home.js`, a `dist/` build, deletion of `project.html` and
other dead files, and a fix for the reduced-motion bug above) is planned but
**not implemented**. Read
[`docs/design/vite-migration.md`](./docs/design/vite-migration.md) in full
before making any structural change to the build/module system, `index.html`'s
script tags, or the files it lists as targeted for deletion — it is the
source of truth for that work and records rejected alternatives so they
aren't re-proposed.
