# CODEMAP.md

Navigation map for AI agents. Read this first for orientation, then open
actual source files only when verifying, implementing, or debugging. This
file is hand-maintained and can drift — re-grep before relying on any
specific line number, and fix this map if a citation is wrong.

## Stack, one line

Static single-page site (`index.html`) + one Vercel serverless function
(`api/scores.js`) backed by MongoDB, built with Vite; no frontend framework.
Entry point chain: `index.html:481` loads `js/main.js` as a module, which
calls `initTerminal()` → `initArcade()` → `initAnimations()` in that order.

## File map

| Path | LOC | Role | Open it when... |
|---|---|---|---|
| `css/home/redesign.css` | 1398 | All page styling | changing layout, section styling, responsive/reduced-motion behavior |
| `index.html` | 483 | Page markup, section structure | adding/reordering sections, changing copy/markup |
| `js/arcade.js` | 320 | Speed-math game + leaderboard UI | touching the arcade game or leaderboard rendering |
| `js/animations.js` | 217 | Scroll/entry animations (GSAP/ScrollTrigger/Lenis) | changing hero/scroll animation behavior |
| `api/scores.js` | 120 | Leaderboard API handler (GET/POST) | changing leaderboard API behavior, rate limiting, ranking |
| `js/terminal.js` | 114 | Hero fake-terminal widget | changing terminal commands/typing demo |
| `scripts/vite-api-plugin.js` | 64 | Dev-server middleware wiring `/api/scores` into Vite | changing how the API is served in dev |
| `api/_lib/db.js` | 52 | MongoDB client/collection helpers | changing DB connection/caching |
| `scripts/export-emails.js` | 51 | Exports collected emails | exporting emails |
| `api/_lib/validate.js` | 38 | Input validation + limits for scores API | changing validation limits |
| `vite.config.js` | 32 | Build/dev-server config | changing build output, dev port, `server.fs.deny` |
| `package.json` | 26 | Scripts, deps, Node engine pin | changing npm scripts/deps |
| `js/main.js` | 7 | Entry point, calls the three init functions | rare — only to change init order |
| `vercel.json` | 6 | Vercel deploy config | changing deploy/build settings |

## Symbol index

### js/main.js
Entry point. Imports and calls, in order: `initTerminal()` (js/terminal.js),
`initArcade()` (js/arcade.js), `initAnimations()` (js/animations.js).

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
| `readStore` | 44 | |
| `writeStore` | 52 | |
| `readBest` | 60 | |
| `writeBest` | 61 | |
| `showPanel` | 66 | |
| leaderboard block | 72 | start |
| `renderBoard` | 74 | |
| `readJson` | 109 | |
| `loadBoard` | 117 | |
| `qualifies` | 149 | |
| `rand` | 154 | |
| `nextProblem` | 157 | |
| `showResult` | 187 | |
| `stop` | 203 | |
| `tick` | 238 | |
| `start` | 246 | |

### js/animations.js
| Symbol | Line | Note |
|---|---|---|
| `export default function initAnimations()` | 12 | |
| Lenis smooth scroll | 15 | |
| nav state + progress bar | 25 | runs on all viewports |
| hero intro | 42 | |
| reduced-motion early return | 40 | everything after skipped if `prefers-reduced-motion`; nav/progress-bar block above always runs |
| desktop pinned story chapter | 99 | |
| desktop pinned horizontal project gallery | 121 | |
| gains ink-fill headlines | 150 | |
| shared reveals + `reveal()` helper | 182-183 | |
| social photo parallax | 203 | |

### api/scores.js
| Symbol | Line | Note |
|---|---|---|
| `clientIp` | 28 | |
| `rateLimited` | 38 | |
| `handleGet` | 50 | |
| GET projection | 56 | explicit field list |
| `handlePost` | 66 | |
| rank computation | 98 | |
| `export default async function handler` | 102 | |

### api/_lib/db.js
| Symbol | Line | Note |
|---|---|---|
| `getClient` | 19 | cached on `globalThis` for warm reuse |
| `export getDb` | 39 | |
| `getScores` | 44 | |
| `getRateLimits` | 49 | |

### api/_lib/validate.js
| Symbol | Line | Note |
|---|---|---|
| `NAME_MAX = 16` | 3 | |
| `EMAIL_MAX = 254` | 4 | |
| `SCORE_MAX = 500` | 5 | |
| `BOARD_LIMIT = 10` | 6 | |
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

## CSS region map — css/home/redesign.css

| Lines | Region |
|---|---|
| 1-56 | header comment, `:root` custom properties, resets, base `html`/`body` |
| 57-65 | blueprint grid backdrop |
| 66-170 | shared primitives (`.eyebrow`, `.chapter-label`, buttons) |
| 171-183 | progress bar |
| 184-242 | nav |
| 243-503 | HERO — `.hero` :245, `.hero-inner` :254, `.hero-title` :265, `.hero-title-line` :274, `.hero-tagline` :288, `.hero-terminal` base rule :303, terminal internals `.term-*` :344-424, `.hero-foot` :425 |
| 319-342 | hero animation from-state, inside `@media (prefers-reduced-motion: no-preference)` |
| 504-554 | story |
| 555-743 | builds (horizontal gallery) |
| 744-855 | gains |
| 856-908 | social |
| 909-952 | join |
| 953-988 | sponsors |
| 989-1349 | arcade / speed math |
| 1350-1376 | footer |
| 1377-1398 | reduced motion overrides |

Responsive breakpoints: `max-width: 767px` blocks at 236, 544, 712, 841,
980; `max-width: 1023px` at 415 (hides `.hero-terminal` at :420-422,
collapses `.hero-inner` to one column); `prefers-reduced-motion: reduce` at
493, 1343, 1378; `prefers-reduced-motion: no-preference` at 319.

## index.html landmarks

| Landmark | Line |
|---|---|
| `<nav class="site-nav">` | 30 |
| `header.hero` | 43 |
| `section.story#story` | 113 |
| `section.builds#builds` | 132 |
| `section.gains#gains` | 215 |
| `section.social#social` | 288 |
| `section.sponsors#sponsors` | 309 |
| `section.join#join` | 325 |
| `section.arcade#arcade` | 361 |
| `footer.site-footer` | 472 |
| module script tag | 481 |

## Data flows

1. **Page load**: `index.html` → module `js/main.js` → `initTerminal()` →
   `initArcade()` → `initAnimations()` in order. GSAP/ScrollTrigger/Lenis are
   npm ES module imports, no globals, no extra script tags.
2. **Leaderboard read**: `loadBoard()` (js/arcade.js:117) → `GET
   /api/scores?limit=10` → `handleGet` (api/scores.js:50) → `getScores()`
   (api/_lib/db.js:44) → MongoDB. Rendered by `renderBoard`
   (js/arcade.js:74) via `createElement`/`textContent`.
3. **Score submit**: form submit in js/arcade.js → `POST /api/scores` →
   `handler` (api/scores.js:102) → `rateLimited` (api/scores.js:38) →
   validators in api/_lib/validate.js → insert → rank computed at
   api/scores.js:98.
4. **Dev vs prod serving**: dev — `scripts/vite-api-plugin.js` dispatches
   `/api/scores` inside Vite's dev server (one process, one port). Prod —
   Vercel compiles `api/` as a serverless function independently of
   `outputDirectory`.

## Where do I look for X

| Task | File(s) |
|---|---|
| Changing hero copy | `index.html:43` (`header.hero`) |
| Changing hero animation | `js/animations.js:42` (hero intro); `css/home/redesign.css:319-342` (from-state) |
| Adding/altering a page section | `index.html` (section landmarks above) + matching region in `css/home/redesign.css` |
| Touching the leaderboard API | `api/scores.js`, `api/_lib/db.js` |
| Changing validation limits | `api/_lib/validate.js:3-6` |
| Changing rate limiting | `api/scores.js:38` |
| Changing the dev server or API dev proxy | `vite.config.js`, `scripts/vite-api-plugin.js` |
| Changing build/deploy config | `vite.config.js`, `vercel.json`, `package.json` |
| Exporting emails | `scripts/export-emails.js` |
| Adjusting responsive behavior | `css/home/redesign.css` breakpoint list above |
| Adjusting reduced-motion behavior | `js/animations.js:40` (JS early return); `css/home/redesign.css:493,1343,1378,319` |

## Before you edit

Invariants, security rules, and known gotchas live in `AGENTS.md`'s "Known
gotchas" section — this map does not restate them. Design rationale and
rejected alternatives for the Vite migration live in
`docs/design/vite-migration.md`.

## Staleness note

Line numbers drift as files change. This map is regenerated by hand, not by
a script. If a citation here looks wrong, trust the code, re-grep to find
the current location, and fix this map.
