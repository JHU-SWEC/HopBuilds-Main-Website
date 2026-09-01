# Arcade leaderboard API

Backs the 30-second speed-math bonus round on the HopBuilds homepage. Node +
Express in front of MongoDB Atlas.

## Endpoints

| Method | Path           | Notes                                              |
| ------ | -------------- | -------------------------------------------------- |
| GET    | `/api/health`  | Liveness check                                      |
| GET    | `/api/scores`  | Top scores. `?limit=` up to 50, defaults to 10      |
| POST   | `/api/scores`  | Body `{ "name": string, "score": integer }`         |

Submissions are validated server-side: names are stripped of control
characters and capped at 16 characters, scores must be whole numbers from 0 to
500, and each IP is limited to 10 submissions per 5 minutes.

## Local development

```bash
cd server
npm install
cp .env.example .env     # then fill in MONGODB_URI
npm run dev
```

The server listens on `http://localhost:3001`. The homepage automatically
points at that URL when opened from `localhost` or `127.0.0.1`, so serving the
site with `python3 -m http.server 8000` from the repo root is enough to test
the full loop.

## Environment

| Variable             | Purpose                                                  |
| -------------------- | -------------------------------------------------------- |
| `MONGODB_URI`        | Atlas connection string, password URL-encoded             |
| `MONGODB_DB`         | Database name, defaults to `hopbuilds`                    |
| `MONGODB_COLLECTION` | Collection name, defaults to `arcade_scores`              |
| `PORT`               | Listen port, defaults to 3001                             |
| `ALLOWED_ORIGINS`    | Comma-separated origins. Empty allows all, dev only       |

`server/.env` holds real credentials and is git-ignored. Never commit it.

## Deploying

The static site can stay on GitHub Pages, but this API needs a host that runs
Node. Render, Railway, and Fly all work on a free or near-free tier.

1. Point the host at this `server/` directory, build command `npm install`,
   start command `npm start`.
2. Set `MONGODB_URI` and `ALLOWED_ORIGINS` as environment variables in the
   host's dashboard. `ALLOWED_ORIGINS` should list the live site origin, for
   example `https://jhu-swec.github.io`.
3. In MongoDB Atlas, add the host's outbound IPs to Network Access, or allow
   `0.0.0.0/0` if the host does not publish stable IPs.
4. Put the resulting base URL into `DEPLOYED_API` in `js/home.js`. Until that
   constant is set, the live site hides the save prompt and shows the
   leaderboard as offline.

## Known limitation

The score is calculated in the browser and sent to the server, so someone with
developer tools open can post a number they did not earn. The validation here
blocks casual nonsense, not a determined cheater. Making it tamper-proof means
having the server generate the problems and grade the answers, which is a
larger change worth making only if the board starts being taken seriously.
