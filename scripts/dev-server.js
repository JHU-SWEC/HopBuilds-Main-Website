/**
 * Local development server.
 *
 * Serves the static site and runs the real api/scores.js handler on the same
 * port, so the page sees the same same-origin /api/scores it gets in
 * production. `vercel dev` does this too, but needs a Vercel login; this needs
 * nothing but MONGODB_URI in .env.local.
 *
 *   npm run dev        then open http://localhost:8000
 *
 * Only routing is reimplemented here. Validation, database access and rate
 * limiting all come from the same modules Vercel executes, so the two cannot
 * drift on anything that matters.
 */

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = process.env.PORT || 8000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

/** Minimal stand-in for the response helpers Vercel injects. */
const wrapResponse = (res) => {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    const body = JSON.stringify(payload);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(body);
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
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        resolve(raw);
      }
    });
  });

const serveApi = async (req, res, url) => {
  /* Imported per request so edits to the handler take effect without a
     restart. The query string busts Node's module cache. */
  const modulePath = pathToFileURL(path.join(ROOT, "api", "scores.js"));
  const { default: handler } = await import(`${modulePath.href}?t=${Date.now()}`);

  req.query = Object.fromEntries(url.searchParams);
  if (req.method === "POST") req.body = await readBody(req);

  await handler(req, wrapResponse(res));
};

const serveStatic = async (req, res, url) => {
  const relative = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname).slice(1);
  const filePath = path.join(ROOT, relative);
  const extension = path.extname(filePath).toLowerCase();

  /* Allowlist, not denylist: only known static types are servable. A denylist
     leaks anything it forgets, and this project keeps credentials in the repo
     root, so a forgotten pattern would serve them. */
  const inServerCode = /^(api|scripts|node_modules)\//.test(relative);
  if (!filePath.startsWith(ROOT) || !TYPES[extension] || inServerCode) {
    res.statusCode = 403;
    return res.end("Forbidden");
  }

  try {
    const data = await fs.readFile(filePath);
    res.setHeader("Content-Type", TYPES[extension]);
    res.setHeader("Cache-Control", "no-store");
    res.end(data);
  } catch (err) {
    res.statusCode = 404;
    res.end("Not found");
  }
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    /* Match Vercel's routing: /api/scores is the only function. */
    if (url.pathname === "/api/scores") return await serveApi(req, res, url);
    if (url.pathname.startsWith("/api/")) {
      res.statusCode = 404;
      return res.end("Not found");
    }
    return await serveStatic(req, res, url);
  } catch (err) {
    console.error(`${req.method} ${url.pathname} failed:`, err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end("Server error");
    }
  }
});

server.listen(PORT, () => {
  console.log(`HopBuilds dev server on http://localhost:${PORT}`);
  console.log(`Leaderboard API at http://localhost:${PORT}/api/scores`);
  if (!process.env.MONGODB_URI) {
    console.warn("MONGODB_URI is not set, so the leaderboard will fail. Check .env.local.");
  }
});
