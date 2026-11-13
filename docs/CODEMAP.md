# CODEMAP.md

Navigation map for AI agents. Read this first for orientation, then open
actual source files only when verifying, implementing, or debugging. This
file is hand-maintained and can drift — re-grep before relying on any
specific line number, and fix this map if a citation is wrong.

## Stack, one line

Static single-page site (`index.html`) + one Vercel serverless function
(`api/scores.js`) backed by MongoDB, built with Vite; no frontend framework.
Entry point chain: `index.html:543` loads `js/main.js` as a module, which
calls `initNav()` → `initTerminal()` → `initArcade()` → `initEffects()` in
that order.

## File map

| Path | LOC | Role | Open it when... |
|---|---|---|---|
| `css/site.css` | 2640 | All page styling, including the CSS-only hero entrance and effects | changing layout, section styling, responsive/reduced-motion behavior |
| `index.html` | 545 | Page markup, section structure | adding/reordering sections, changing copy/markup |
| `js/arcade.js` | 367 | Speed-math game + leaderboard UI | touching the arcade game or leaderboard rendering |
| `js/effects.js` | 99 | Scroll reveal, card spotlight, count-up, ticker pause | changing any page effect |
| `js/nav.js` | 33 | Phone menu sheet | changing the mobile menu |
| `api/scores.js` | 238 | Leaderboard API handler (GET/POST) | changing leaderboard API behavior, rate limiting, ranking, one-row-per-email |
| `api/session.js` | 44 | Mints the one-time token POST /api/scores requires | changing score-submission gating |
| `js/terminal.js` | 114 | Hero fake-terminal widget | changing terminal commands/typing demo |
| `scripts/vite-api-plugin.js` | 72 | Dev-server middleware wiring `/api/scores` into Vite | changing how the API is served in dev |
| `api/_lib/db.js` | 61 | MongoDB client/collection helpers | changing DB connection/caching |
| `scripts/test-leaderboard.js` | 210 | End-to-end checks for the one-row-per-player rule | changing scoring, dedupe, or submission gating |
| `scripts/dedupe-scores.js` | 106 | One-time collapse of pre-rule duplicate board rows | cleaning up legacy duplicate entries |
| `scripts/export-emails.js` | 51 | Exports collected emails | exporting emails |
| `api/_lib/validate.js` | 41 | Input validation + limits for scores API | changing validation limits, board size |
| `vite.config.js` | 32 | Build/dev-server config | changing build output, dev port, `server.fs.deny` |
| `package.json` | 29 | Scripts, deps, Node engine pin | changing npm scripts/deps |
| `js/main.js` | 9 | Entry point, calls the four init functions | rare — only to change init order |
| `vercel.json` | 6 | Vercel deploy config | changing deploy/build settings |

## Symbol index

### js/main.js
Entry point. Imports and calls, in order: `initNav()` (js/nav.js),
`initTerminal()` (js/terminal.js), `initArcade()` (js/arcade.js),
`initEffects()` (js/effects.js).

### js/terminal.js
| Symbol | Line | Note |
|---|---|---|
| `export default function initTerminal()` | 1 | |
| `trim()` | 14 | |
| `printOut()` | 18 | |
| `printCmd()` | 26 | |
| `run(raw)` | 65 | command dispatch |
| `typeNext()` | 100 | idle auto-typing demo |

### js/arcade.js
| Symbol | Line | Note |
|---|---|---|
| `export default function initArcade()` | 1 | |
| `readStore` | 54 | |
| `writeStore` | 62 | |
| `readBest` | 70 | |
| `writeBest` | 71 | |
| `showPanel` | 76 | |
| leaderboard block | 82 | start |
| `renderBoard` | 84 | caps the row stagger; scrolls the saved row into the list's own box |
| `readJson` | 130 | |
| `loadBoard` | 138 | asks for `?limit=BOARD_MAX`, i.e. the whole board |
| `rand` | 171 | |
| `nextProblem` | 174 | |
| `showResult` | 204 | |
| `stop` | 220 | offers the save form for any finished round, whatever the score |
| `tick` | 259 | |
| `start` | 267 | requests a session token for the round |

### js/effects.js
| Symbol | Line | Note |
|---|---|---|
| `initReveal` | 17 | arms `html.reveal-armed`, staggers siblings via `--d`, IntersectionObserver adds `.is-in` |
| `initSpotlight` | 42 | `.spot` cards: sets `--mx` / `--my` on pointermove (hover devices only) |
| `initCountUp` | 53 | `[data-count]` rolls 0 to its value once in view |
| `initTicker` | 83 | the hero ticker's Pause/Play button |
| `export default function initEffects()` | 94 | |

### js/nav.js
| Symbol | Line | Note |
|---|---|---|
| `export default function initNav()` | 6 | toggle, Escape, close on link, close when widened past 960px |

### api/scores.js
| Symbol | Line | Note |
|---|---|---|
| `clientIp` | 58 | trusts only `x-vercel-forwarded-for`; never `x-forwarded-for` |
| `rateLimited` | 68 | |
| `claimSession` | 86 | redeems the one-time token from `api/session.js` |
| `recordBest` | 115 | one row per email, holding that player's highest score |
| `handleGet` | 157 | `?limit=` capped at `BOARD_MAX`, defaults to `BOARD_LIMIT` |
| GET projection | 167 | explicit field list |
| `handlePost` | 177 | validates first, then claims the token |
| rank computation | 216 | |
| `export default async function handler` | 220 | |

### api/_lib/db.js
| Symbol | Line | Note |
|---|---|---|
| `getClient` | 19 | cached on `globalThis` for warm reuse |
| `export getDb` | 39 | |
| `getScores` | 44 | |
| `getRateLimits` | 53 | collection name overridable for tests |
| `getSessions` | 58 | collection name overridable for tests |

### api/_lib/validate.js
| Symbol | Line | Note |
|---|---|---|
| `NAME_MAX = 16` | 3 | |
| `EMAIL_MAX = 254` | 4 | |
| `SCORE_MAX = 150` | 5 | |
| `BOARD_LIMIT = 10` | 6 | rows a bare GET returns |
| `BOARD_MAX = 500` | 7 | ceiling on `?limit=`; the page asks for this to get the whole board |
| `cleanName` | 9 | |
| `cleanScore` | 19 | |
| `cleanEmail` | 29 | |

### scripts/vite-api-plugin.js
| Symbol | Line | Note |
|---|---|---|
| `wrapResponse` | 6 | |
| `readBody` | 16 | |
| `export default function apiPlugin()` | 26 | registers middleware in `configureServer`; dispatches `/api/scores` on the same port as the dev server |

### vite.config.js
`defineConfig` at line 8. Sets plugins (the API plugin), `build.outDir:
"dist"`, `server.port` (8000, `strictPort`), `server.fs.deny`.

## CSS region map — css/site.css

| Lines | Region |
|---|---|
| 1-410 | header comment, `:root` tokens (palette, fonts, radii), resets, `.serif`, grounds (`.dark`, `.band-white`, `.band-tint`), heads, buttons, `.link` |
| 411-571 | nav (floating glass pill, phone sheet) |
| 572-1089 | 1 hero: aurora, grid lines, grain, terminal, chips, sticker, entrance keyframes, word ticker |
| 1090-1136 | 2 story statement |
| 1137-1438 | 3 projects bento (tiles, browser frames, stat tiles, `.spot`) |
| 1439-1592 | 4 semester timeline |
| 1593-1841 | 5 mentors: perks, orbit diagram, alumni logos |
| 1842-1930 | 6 team life polaroid |
| 1931-2104 | 7 sponsor (turning conic border) and 8 roles |
| 2105-2459 | 9 drill (arcade game and leaderboard) |
| 2460-2601 | close CTA band, giant wordmark, footer |
| 2602-2620 | scroll reveal |
| 2621-end | reduced motion |

Breakpoints sit next to the rules they change: 1279px (hero sticker),
1023px (hero terminal hides, grids stack), 959px (nav to menu), 899px,
799px, 699px, 639px (phone), 479px.

## index.html landmarks

| Landmark | Line |
|---|---|
| `header.nav` | 34 |
| `section.hero#top` | 66 |
| `section.story` | 146 |
| `section.projects` | 167 |
| `section.semester` | 226 |
| `section.mentors` | 261 |
| `section.life` | 330 |
| `section.join` (sponsor + roles) | 361 |
| `section.drill` | 410 |
| `footer.closing` | 509 |
| module script tag | 543 |

## Data flows

1. **Page load**: `index.html` → module `js/main.js` → `initTerminal()` →
   `initArcade()` → `initEffects()` in order. No runtime npm dependencies.
2. **Leaderboard read**: `loadBoard()` (js/arcade.js:120) → `GET
   /api/scores?limit=10` → `handleGet` (api/scores.js:137) → `getScores()`
   (api/_lib/db.js:44) → MongoDB. Rendered by `renderBoard`
   (js/arcade.js:76) via `createElement`/`textContent`.
3. **Score submit**: starting a round requests a token from `POST /api/session`
   (js/arcade.js:249). Form submit in js/arcade.js → `POST /api/scores` →
   `handler` (api/scores.js:196) → `rateLimited` (api/scores.js:51) →
   validators in api/_lib/validate.js → `claimSession` (api/scores.js:69) →
   `recordBest` (api/scores.js:98), which writes the player's single row →
   rank computed at api/scores.js:192.
4. **Dev vs prod serving**: dev — `scripts/vite-api-plugin.js` dispatches
   `/api/scores` inside Vite's dev server (one process, one port). Prod —
   Vercel compiles `api/` as a serverless function independently of
   `outputDirectory`.

## Where do I look for X

| Task | File(s) |
|---|---|
| Changing hero copy | `index.html:66` (`section.hero`) |
| Changing hero animation | `css/site.css` `@keyframes enter` / `enter-stage` (CSS only) |
| Adding/altering a page section | `index.html` (section landmarks above) + matching region in `css/site.css` |
| Touching the leaderboard API | `api/scores.js`, `api/_lib/db.js` |
| Changing validation limits | `api/_lib/validate.js:3-6` |
| Changing rate limiting | `api/scores.js:51` |
| Changing one-row-per-email or best-score behavior | `api/scores.js:98` (`recordBest`) |
| Changing score-submission gating | `api/session.js`, `api/scores.js:69` (`claimSession`) |
| Changing the dev server or API dev proxy | `vite.config.js`, `scripts/vite-api-plugin.js` |
| Changing build/deploy config | `vite.config.js`, `vercel.json`, `package.json` |
| Exporting emails | `scripts/export-emails.js` |
| Cleaning up legacy duplicate board rows | `scripts/dedupe-scores.js` |
| Testing the leaderboard end to end | `scripts/test-leaderboard.js` |
| Adjusting responsive behavior | `css/site.css` breakpoint list above |
| Adjusting reduced-motion behavior | `js/effects.js` (`reduced()`); the last block of `css/site.css` |

## Before you edit

Invariants, security rules, and known gotchas live in `AGENTS.md`'s "Known
gotchas" section — this map does not restate them. Design rationale and
rejected alternatives for the Vite migration live in
`docs/design/vite-migration.md`.

## Staleness note

Line numbers drift as files change. This map is regenerated by hand, not by
a script. If a citation here looks wrong, trust the code, re-grep to find
the current location, and fix this map.
