# HopBuilds Main Website

The marketing/recruiting homepage for HopBuilds, JHU's student software engineering
club, live at [hopbuilds.org](https://hopbuilds.org/). It's a single static page
(`index.html`) plus one serverless API endpoint that powers a speed-math arcade
game embedded on the page, backed by a MongoDB Atlas leaderboard.

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in MONGODB_URI
npm run dev                  # http://localhost:8000
```

`npm run dev` serves the page and runs the leaderboard API on the same port, so
the arcade game's requests to `/api/scores` work exactly like they do in
production. It needs no Vercel account. See [`DEPLOY.md`](./DEPLOY.md) for
production deployment (Vercel) and environment variable details.

## How the page is built

There is no build step, no bundler, and no frontend framework. `index.html` is
served as-is; it links `css/home/redesign.css` for styling and loads
`js/home.js`, GSAP, ScrollTrigger, and Lenis as classic `<script>` tags
(`index.html:482-485`). The vendored libraries in `js/vendor/` are committed
minified files, not npm dependencies.

`js/home.js` is a single 619-line IIFE with three parts:

- **Hero terminal widget** (lines 9-120) — the interactive fake-shell in the
  hero section.
- **Speed-math arcade game** (lines 123-442) — the 30-second drill and its
  calls to `/api/scores`.
- **GSAP/ScrollTrigger/Lenis scroll animations** (lines 445-619) — pinned
  sections, reveals, and the smooth-scroll setup.

A Vite-based migration (real npm dependencies, an ES module split, a build
step) is planned but **not yet implemented**. See
[`docs/design/vite-migration.md`](./docs/design/vite-migration.md) for the
design doc if you're picking up that work.

## Repo structure

| Path                    | What it is                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `index.html`             | The entire live site: a single scroll-driven page.                                           |
| `css/home/redesign.css`  | All homepage styling, self-contained.                                                        |
| `css/lenis.css`          | Smooth-scroll library styles for Lenis.                                                      |
| `js/home.js`             | Hero terminal + arcade game + scroll animations (see above).                                 |
| `js/vendor/`             | GSAP, ScrollTrigger, and Lenis, vendored as minified files. Not npm dependencies; do not edit.|
| `assets/`                | Images used by the site. `Blue_Jay_Coding_Icon.png` at the repo root is the favicon.          |
| `api/scores.js`          | The one serverless function, served at `/api/scores`. GET returns top scores, POST submits one.|
| `api/_lib/db.js`         | MongoDB client, cached on `globalThis` so warm invocations reuse the connection pool.         |
| `api/_lib/validate.js`   | Input validation shared by the leaderboard endpoints.                                         |
| `scripts/dev-server.js`  | Local dev server (`npm run dev`); serves static files and dispatches `/api/scores` to the real handler. |
| `scripts/export-emails.js`| Dumps collected leaderboard emails to CSV.                                                   |
| `vercel.json`             | Vercel config; no build step, repo root is the docroot, `api/` compiles automatically.       |
| `DEPLOY.md`               | Deployment instructions and environment variable reference.                                  |
| `docs/design/vite-migration.md` | Design doc for the planned (not yet implemented) Vite migration.                       |

Note: `project.html` and `content/data.js` also exist in the repo but are
orphaned/dead code — see [`AGENTS.md`](./AGENTS.md) for details.

## npm scripts

| Script                | What it does                                                                    |
| ---------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`           | Starts `scripts/dev-server.js` on `http://localhost:8000`.                       |
| `npm run dev:vercel`    | Runs `vercel dev` for a closer match to the production runtime. Requires the Vercel CLI and a login. |
| `npm run export-emails` | Runs `node scripts/export-emails.js` to export collected leaderboard emails.     |

## Requirements

Node `>=18` (see `package.json` `engines`).
