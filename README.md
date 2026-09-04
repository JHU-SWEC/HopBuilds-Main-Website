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

`index.html` links `css/home/redesign.css` for styling and loads a single ES
module entry point, `js/main.js` (`index.html:481`), which imports GSAP,
ScrollTrigger, and Lenis as real npm dependencies and initializes three
sibling modules:

- **`js/terminal.js`** — the interactive fake-shell in the hero section.
- **`js/arcade.js`** — the 30-second speed-math drill and its calls to
  `/api/scores`.
- **`js/animations.js`** — GSAP/ScrollTrigger/Lenis scroll animations: pinned
  sections, reveals, and the smooth-scroll setup. The hero intro's animation
  from-state is split between this file and `css/home/redesign.css`, so the
  two must be changed together.

`npm run build` bundles this with Vite into `dist/`, and `vercel.json` points
Vercel at that same `vite build` / `dist` output. See
[`docs/design/vite-migration.md`](./docs/design/vite-migration.md) for the
design doc behind this module split — it's a historical record of a completed
migration, not a forward-looking plan, if you want the reasoning behind it.

## Repo structure

| Path                    | What it is                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `index.html`             | The entire live site: a single scroll-driven page.                                           |
| `vite.config.js`         | Vite config: dev server, the `vite-api-plugin.js` middleware, and the `dist/` build.          |
| `.nvmrc`                 | Pins local Node tooling to Node 22, matching `package.json`'s `engines.node`.                 |
| `css/home/redesign.css`  | All homepage styling, self-contained.                                                        |
| `assets/`                | Images used by the site. `Blue_Jay_Coding_Icon.png` at the repo root is the favicon.          |
| `api/scores.js`          | The one serverless function, served at `/api/scores`. GET returns top scores, POST submits one.|
| `api/_lib/db.js`         | MongoDB client, cached on `globalThis` so warm invocations reuse the connection pool.         |
| `api/_lib/validate.js`   | Input validation shared by the leaderboard endpoints.                                         |
| `scripts/vite-api-plugin.js` | Vite dev-server plugin (`npm run dev`); dispatches `/api/scores` to the real handler.     |
| `scripts/export-emails.js`| Dumps collected leaderboard emails to CSV.                                                   |
| `vercel.json`             | Vercel config; points `buildCommand`/`outputDirectory` at `vite build`/`dist`, `api/` compiles independently. |
| `DEPLOY.md`               | Deployment instructions and environment variable reference.                                  |
| `docs/design/vite-migration.md` | Design doc for the Vite migration, kept as a historical record of a completed migration. |

## npm scripts

| Script                | What it does                                                                    |
| ---------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`           | Starts Vite's dev server on `http://localhost:8000`, extended by `scripts/vite-api-plugin.js` for `/api/scores`. |
| `npm run build`         | Runs `vite build`, producing the production bundle in `dist/`.                   |
| `npm run preview`       | Runs `vite preview` to serve the `dist/` build locally, for a pre-push sanity check. |
| `npm run dev:vercel`    | Runs `vercel dev` for a closer match to the production runtime. Requires the Vercel CLI and a login. |
| `npm run export-emails` | Runs `node scripts/export-emails.js` to export collected leaderboard emails.     |

## Requirements

Node 22.x — pinned in `package.json`'s `engines` and in `.nvmrc`, matching
Vite's own minimum (`^20.19.0 || >=22.12.0`).
