# AGENTS.md

Read [`docs/CODEMAP.md`](./docs/CODEMAP.md) first for orientation — it maps
which file and roughly which lines hold what. Open individual source files
only when verifying, implementing, or debugging. This file remains
authoritative for conventions, security rules, and known gotchas; CODEMAP is
navigation only.

## Project overview

HopBuilds Main Website is the static marketing/recruiting homepage for
HopBuilds, JHU's student software engineering club, live at
https://hopbuilds.org/. It's a single HTML page plus one Vercel serverless
function (`api/scores.js`) backing a MongoDB-stored leaderboard for a
speed-math arcade game embedded on the page. No frontend framework; a Vite
build compiles `js/main.js`'s ES module graph into `dist/`.

## Setup / build / test

```bash
npm install
cp .env.example .env.local   # then fill in MONGODB_URI
npm run dev                  # http://localhost:8000
```

- `npm run dev` — starts Vite's dev server, extended by
  `scripts/vite-api-plugin.js`, which dispatches `/api/scores` to
  `api/scores.js` on the same port.
- `npm run build` — runs `vite build`, producing the production bundle in
  `dist/`.
- `npm run preview` — runs `vite preview` to serve the `dist/` build locally,
  for a pre-push sanity check of the production bundle.
- `npm run dev:vercel` — `vercel dev`, closer to the production runtime; needs
  the Vercel CLI and a login.
- `npm run export-emails` — `node scripts/export-emails.js`, dumps leaderboard
  emails to CSV.
- There is no lint/test command in `package.json`.
- Node 22.x is required (`package.json` `engines`, `.nvmrc`) — Vite requires
  Node `^20.19.0 || >=22.12.0`.
- `vite.config.js` configures the dev server, the `vite-api-plugin.js`
  middleware, and the `dist/` build.
- Env vars: `MONGODB_URI` (required), `MONGODB_DB` (defaults `hopbuilds`),
  `MONGODB_COLLECTION` (defaults `arcade_scores`). See `.env.example` and
  `DEPLOY.md`.

## Code conventions

- Vanilla JS, no framework. Vite bundles real ES modules for production; there
  is no runtime framework doing rendering or state management.
- `index.html` loads a single module entry point, `js/main.js`
  (`index.html:481`), which imports `js/terminal.js`, `js/arcade.js`, and
  `js/animations.js`. GSAP, ScrollTrigger, and Lenis are real npm dependencies,
  imported as ES modules (`import gsap from "gsap"`, etc.) — not globals, not
  classic script tags.
- CSS uses flat kebab-case class names (e.g. `.arcade-board-list`,
  `.hero-terminal`), not BEM.
- Theming goes through CSS custom properties defined on `:root` in
  `css/home/redesign.css` (`--ink`, `--spirit`, `--slate`, etc.).
- DOM nodes carrying user- or player-supplied data are built with
  `document.createElement` + `.textContent`, never `innerHTML`. This is
  deliberate, not incidental: see `js/arcade.js:74-98` (`renderBoard`, which
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

- The hero terminal is `display: none` below 1024px
  (`css/home/redesign.css:420-422`), but `initTerminal()` still runs
  underneath it. Known, deliberately deferred.
- Scores are computed client-side (`js/arcade.js`) and trusted by the server.
  This is a documented, accepted limitation (see `DEPLOY.md`), not a bug to
  fix.
- The Vite dev server (`scripts/vite-api-plugin.js`/`vite`) never sets
  `x-forwarded-for` on local requests, so `clientIp()` (`api/scores.js:28-32`)
  resolves every local request to the same rate-limit bucket. Expected
  locally; only matters behind Vercel's proxy in production.
- The hero intro animation's "from-state" is duplicated across two files with
  nothing enforcing they agree: `css/home/redesign.css:319-342` (inside
  `@media (prefers-reduced-motion: no-preference)`) sets `opacity: 0` plus
  transforms on `.hero-title-line`, `.hero-eyebrow`, `.hero-tagline`,
  `.hero-actions`, and `.hero-terminal`, to prevent a flash of the final
  layout before the deferred module script runs; `js/animations.js:43-96`
  holds the matching GSAP hero tweens. Two production bugs have already come
  out of this duplication, and neither was catchable by `npm run build` or by
  code review — check the rendered hero in a browser after touching either
  file.
  - Tweens must use `gsap.fromTo`, never `gsap.from`. `gsap.from` animates
    FROM the given values TO the element's current computed state, and the
    CSS has already set that computed state to `opacity: 0` — so the hero
    animated 0 to 0 and stayed permanently invisible.
  - If a CSS from-state expresses an offset as a percentage, the tween must
    explicitly name and zero `y`. GSAP decomposes the computed transform
    matrix into a pixel `y`, not into `yPercent`, then composes the pixel
    and percent translates together; a tween naming only `yPercent` leaves
    that decomposed pixel offset in place forever, which is what pushed the
    title lines down onto the tagline. The px-based from-states don't hit
    this because their tweens already name `y`.
  - That CSS block must stay after the base `.hero-terminal` rule at
    `css/home/redesign.css:303`. Media queries add no specificity, so at
    equal specificity source order decides the winner; the block was
    originally placed above the base rule and the base rule's
    `transform: rotate(-1.5deg)` silently won.

## Vite migration

The Vite migration (real npm dependencies for GSAP/ScrollTrigger/Lenis, an ES
module split of the previous single-file homepage script, a `dist/` build, and
deletion of orphaned pages and other dead files) is complete: all phases are
committed on `miles/vite-migration`, `origin/main` has been merged in, and the
branch is pushed. All that's left is landing it on `main` via PR. Read
[`docs/design/vite-migration.md`](./docs/design/vite-migration.md) for the
historical record of that work — it's not a standing pre-change checklist
anymore, but it still records rejected alternatives so they aren't
re-proposed.
