import { defineConfig } from "vite";
import dotenv from "dotenv";
import apiPlugin from "./scripts/vite-api-plugin.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

export default defineConfig({
  plugins: [apiPlugin()],
  build: {
    outDir: "dist",
    rollupOptions: {
      // The live homepage plus the two UI rebuild candidates, each served
      // at /rebuilds/<name>/. Drop the candidates once one is chosen.
      input: {
        main: "index.html",
        watts: "rebuilds/watts/index.html",
        brutal: "rebuilds/brutal/index.html",
        brutalTeam: "rebuilds/brutal/team.html",
      },
    },
  },
  server: {
    port: Number(process.env.PORT) || 8000, // keep the URL DEPLOY.md already documents
    strictPort: true, // fail loudly instead of silently moving to 8001+, see note below
    fs: {
      // Vite's `server.fs.deny` REPLACES Vite's built-in defaults, it does not
      // extend them (see note below) — every one of Vite's own default entries
      // has to be listed here explicitly, alongside the three custom ones this
      // project needs, or they're silently gone.
      deny: [
        "**/api/**",
        "**/scripts/**",
        "**/*.env",
        ".env",
        ".env.*",
        "*.{crt,pem,key,p12,pfx,cer,der}",
        ".npmrc",
        ".yarnrc.yml",
        "**/.git/**",
      ],
    },
  },
});
