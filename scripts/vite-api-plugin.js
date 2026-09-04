import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
      // routing priority of checking /api/scores first.
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, "http://localhost");
        if (url.pathname !== "/api/scores") {
          if (url.pathname.startsWith("/api/")) {
            res.statusCode = 404;
            return res.end("Not found");
          }
          return next();
        }
        try {
          const modulePath = pathToFileURL(path.join(ROOT, "api", "scores.js"));
          const { default: handler } = await import(`${modulePath.href}?t=${Date.now()}`);
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
