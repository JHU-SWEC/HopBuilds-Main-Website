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
- `npm run dedupe-scores` — `node scripts/dedupe-scores.js`, reports the
  leaderboard rows left over from before the board enforced one entry per
  player. Reports only; pass `-- --apply` to actually collapse them. A one-time
  backfill, not part of any routine workflow.
- `npm run test-leaderboard:serve` then, in a second terminal,
  `npm run test-leaderboard` — end-to-end checks that the board keeps one row
  per player at their best score. Both commands point the board, session, and
  rate-limit collections at throwaway names and drop them afterward, so a run
  touches no production data. Needs `MONGODB_URI`.
- There is no lint command, and `test-leaderboard` is the only test; there is
  no framework behind it, just a script that exits non-zero on failure.
- Node 22.x is required (`package.json` `engines`, `.nvmrc`) — Vite requires
  Node `^20.19.0 || >=22.12.0`.
- `vite.config.js` configures the dev server, the `vite-api-plugin.js`
  middleware, and the `dist/` build.
- Env vars: `MONGODB_URI` (required), `MONGODB_DB` (defaults `hopbuilds`),
  `MONGODB_COLLECTION` (defaults `arcade_scores`). `MONGODB_SESSION_COLLECTION`
  and `MONGODB_RATE_LIMIT_COLLECTION` (defaulting to `arcade_sessions` and
  `arcade_rate_limits`) exist so the leaderboard test can run without spending
  the live rate-limit budget; leave them unset everywhere else. See
  `.env.example` and `DEPLOY.md`.

## Code conventions

- Vanilla JS, no framework. Vite bundles real ES modules for production; there
  is no runtime framework doing rendering or state management.
- `index.html` loads a single module entry point, `js/main.js`
  (the last `<script>` in `index.html`), which imports `js/nav.js`,
  `js/terminal.js`, `js/arcade.js`, and `js/effects.js`. There are no runtime
  npm dependencies on the page: GSAP and Lenis were removed in the redesign.
  Every effect is CSS plus a few lines of vanilla JS.
- CSS uses flat kebab-case class names (e.g. `.arcade-board-list`,
  `.hero-terminal`), not BEM.
- Theming goes through CSS custom properties defined on `:root` in
  `css/site.css` (`--night` deep Heritage Blue for the blue sections and frames, `--accent` Spirit Blue, `--surface` white and `--surface-2` cool tint for the light sections, `--warn` JHU Orange for the drill timer only, etc.). Every text pair is 7:1 or better; the design has no cream, by request.
  Fonts: Bricolage Grotesque (display and text), Instrument Serif italic (one
  accent word per heading, `.serif`), DM Mono (code, numbers), all from Google
  Fonts, which the CSP in `vercel.json` allows.
- DOM nodes carrying user- or player-supplied data are built with
  `document.createElement` + `.textContent`, never `innerHTML`. This is
  deliberate, not incidental: see `js/arcade.js:76-100` (`renderBoard`, which
  writes leaderboard names) and the API response shaping in `api/scores.js`.
  Do not introduce `innerHTML` for anything that touches player-supplied
  strings.

## Security rules

- Never commit `.env` or `.env.local`. `.env.example` holds placeholders
  only — never put a real connection string in it.
- In production, MongoDB credentials live in the Vercel dashboard
  (Project Settings → Environment Variables), not in a committed file.
- Never log or return the `email` field from `api/scores.js`. The GET
  projection (`api/scores.js:143`) lists fields explicitly (`name`, `score`,
  `createdAt`) so a new field can't leak by accident — keep that pattern if
  you touch the projection. The same rule covers error logging: a Mongo
  duplicate-key error quotes the offending key back, so the unique-email index
  in `recordBest` logs `err.code` and never `err.message`.

## Known gotchas — do not "fix" without being asked

- The hero terminal is `display: none` below 1024px
  (`css/site.css`, search for "deliberately deferred"), but `initTerminal()` still runs
  underneath it. Known, deliberately deferred.
- The leaderboard lists every player, not a top ten: any finished round is
  offered the save form whatever the score, and the page pulls the whole board
  in one request (`?limit=BOARD_MAX`) into a `max-height` scroll box. One row
  per email still holds, and that row keeps the player's highest score -- a
  worse run never displaces a better one. This depends on `renderBoard`
  capping the CSS stagger index,
  because rows animate `backwards` and an uncapped delay leaves the tail of a
  long board invisible.
- Scores are graded server-side. `POST /api/session` generates the round's
  problems (`api/_lib/drill.js`) and stores them with a one-time token,
  claimable only after ~27s; the browser plays those problems and submits
  `answers: [{ value, t }]`, and `gradeRun` recomputes the score. Any `score`
  field in the body is ignored. The browser must still know each answer to
  auto-advance, so a script that solves the served problems can post a
  perfect round paced at `MIN_ANSWER_GAP_MS`; that residual is accepted.
- A board row belongs to the browser that first saved it: the first save
  returns an `ownerKey`, kept in localStorage and stored server-side only as a
  SHA-256 hash, and later saves for that email must present it or get a 403.
  This blocks renaming someone else's row by typing their email; the accepted
  cost is that a player on a new device (or after clearing site data) cannot
  update their row from there. Rows that predate the key are claimed by
  whoever next saves under that email.
- `vercel.json` sets a strict Content-Security-Policy (no inline scripts or
  styles; fonts only from Fontshare and Google Fonts). Adding an inline
  `<script>`, a `style="..."` attribute, `setAttribute("style", ...)`, or a
  new third-party origin will be blocked in production but not in
  `npm run dev`, which does not apply those headers. Update the policy with
  the change.
- `clientIp()` (`api/scores.js`, search for `export const clientIp`) reads only
  `x-vercel-forwarded-for` and otherwise falls back to the socket address. Do
  not "fix" it to read `x-forwarded-for`: that header is client-writable, and
  keying the rate limiter on it lets a script rotate a fake address per request
  and post without any ceiling. Locally there is no Vercel proxy, so every
  request resolves to the same loopback bucket -- expected, not a bug.
- The hero entrance is CSS only (`@keyframes enter` / `enter-stage` in
  `css/site.css`), so there is no JS from-state to keep in sync with it.
- Scroll reveals (`.reveal`) only hide content once `js/effects.js` has added
  `html.reveal-armed`, so without script, under reduced motion, or without
  IntersectionObserver everything stays visible. They animate the `translate`
  property, never `transform`: a reveal that sets `transform: none` cancels
  any block's own transform (it broke the polaroid's tilt and the cards' hover
  lift during the build).
- Images with `width`/`height` attributes rely on the global `img { height:
  auto }` rule. Without it the attribute height wins over `aspect-ratio`, and
  the 1067px-tall screenshot attributes blew the bento tiles up.
- Each `section` sets `overflow-x: clip` so the orbit's rotating labels and
  the glow blobs never widen the page on a phone. `clip` does not create a
  scroll container, so it is safe for future `position: sticky`.
- The hero's word ticker loops forever, so it has a Pause button (WCAG 2.2.2);
  keep one if the ticker changes.
- Page images come from `assets/web/` (web-sized copies made with `sips`).
  The originals under `assets/project/`, `assets/home/` and `assets/source/`
  are the sources; re-export from them rather than editing the copies.

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
