import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const wrapResponse = (res) => {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
    return res;
  };
  return res;
};

const readBody = (req) =>
  new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      if (!raw) return resolve(undefined);
      try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
    });
  });

export default function apiPlugin() {
  return {
    name: "hopbuilds-api",
    configureServer(server) {
      // Registering here (not returning a function) runs this middleware
      // BEFORE Vite's own internal middlewares, matching dev-server.js's
      // routing priority of checking /api/* first.
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, "http://localhost");
        if (!url.pathname.startsWith("/api/")) {
          return next();
        }
        const name = url.pathname.slice("/api/".length);
        // Only top-level api/<name>.js files are routable; reject anything
        // with a "/" (including reaching into api/_lib/) or ".." segments.
        if (!name || name.includes("/") || name.includes("..")) {
          res.statusCode = 404;
          return res.end("Not found");
        }
        // No database configured locally (no MONGODB_URI in .env.local): show
        // the live board instead of an error, READ-ONLY. Only GET /api/scores
        // is forwarded; sessions and score saves still go to the local handler,
        // which refuses them, so the drill runs as a practice round and local
        // testing can never write to the live leaderboard. Set
        // DEV_LEADERBOARD_MIRROR to another origin, or to "off" to disable.
        const mirror = process.env.DEV_LEADERBOARD_MIRROR ?? "https://www.hopbuilds.org";
        if (!process.env.MONGODB_URI && mirror !== "off" && name === "scores" && req.method === "GET") {
          try {
            const upstream = await fetch(new URL(`/api/scores${url.search}`, mirror), {
              headers: { Accept: "application/json" },
              signal: AbortSignal.timeout(8000),
            });
            res.statusCode = upstream.status;
            res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
            res.setHeader("X-Dev-Leaderboard", `read-only mirror of ${mirror}`);
            return res.end(await upstream.text());
          } catch (err) {
            console.warn(`Leaderboard mirror ${mirror} unreachable: ${err.message}`);
            // fall through to the local handler and its "not configured" message
          }
        }
        const modulePath = path.join(ROOT, "api", `${name}.js`);
        if (!existsSync(modulePath)) {
          res.statusCode = 404;
          return res.end("Not found");
        }
        try {
          const { default: handler } = await server.ssrLoadModule(`/api/${name}.js`);
          // Ported unchanged from dev-server.js:79, including its known gap: Object.fromEntries
          // collapses a repeated query key to its last value, where Vercel's Node runtime gives
          // an array for repeated keys. This plugin does not fully match Vercel's req.query
          // contract for that edge case. It's harmless today only because api/scores.js:51 reads
          // req.query?.limit as a scalar and no handler currently relies on repeated-key arrays —
          // if a future handler needs that, this line needs a real fix, not just this comment.
          req.query = Object.fromEntries(url.searchParams);
          if (req.method === "POST") req.body = await readBody(req);
          await handler(req, wrapResponse(res));
        } catch (err) {
          console.error(`${req.method} ${url.pathname} failed:`, err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end("Server error");
          }
        }
      });
    },
  };
}
