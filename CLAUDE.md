# CLAUDE.md

Read [`AGENTS.md`](./AGENTS.md) first — it is the primary contributor guide and
covers project overview, setup, code conventions, security rules, and known
gotchas. Everything there applies to Claude Code too. This file adds only what
is specific to working in this repo through Claude Code, and does not repeat
`AGENTS.md`.

## Environment — this bites every session

- **This project requires Node 22.** The machine's default `node` is newer
  (v26.x). `package.json` pins `"engines": { "node": "22.x" }`.
- **Shell state does not persist between Bash tool calls.** `nvm use` in one
  call has no effect on the next. Activate it inline in *every* command that
  runs node or npm:
  ```bash
  source "$HOME/.nvm/nvm.sh" && nvm use 22 && npm run build
  ```
  A bare `npm run build` silently runs under the wrong Node version.

## Secrets

- `.env.local` contains a live MongoDB connection string. **Do not read it, do
  not `cat` it, do not print it into the transcript.** Anything echoed into a
  conversation is stored and must be treated as compromised.
- To write a secret to a file, write it directly (`echo 'KEY=value' >
  .env.local`) rather than pasting it into chat first.
- `.gitignore:4` (`.env.*`) covers `.env.local`. `.npmrc` is **not** ignored —
  if a test creates one, delete it before staging.

## Migration in flight — check state before trusting docs

This repo is mid-way through the Vite migration described in
[`docs/design/vite-migration.md`](./docs/design/vite-migration.md), which is the
source of truth for that work and records rejected alternatives so they are not
re-proposed. Phases are landing incrementally on `miles/vite-migration`.

**`AGENTS.md` is partly stale as a result** and is scheduled for correction in
the migration's Phase 5. As of Phase 2, these `AGENTS.md` claims are no longer
true: there *is* a build step (`vite build`), `npm run dev` starts Vite (not
`scripts/dev-server.js`, which has been deleted), and `package.json` *does*
have build and preview scripts. Run `git log --oneline -10` and read the design
doc's phase sections before assuming any documented build/module detail still
holds.

## Verification habits this repo has earned the hard way

- **Verify line numbers before editing.** Design-doc line references drift as
  the doc is revised, and paginated reads can be off by one. Re-grep for the
  actual content instead of trusting a cited `file:line`.
- **`grep -c` counts matching *lines*, not occurrences.** For an occurrence
  count use:
  ```bash
  tr -s ' \n' ' ' < file | grep -o -e 'needle' | wc -l
  ```
- **A deny-list test against a file that does not exist proves nothing.** Vite's
  `server.fs.deny` only returns 403 for a path that matches a deny pattern *and*
  exists on disk; otherwise the request falls through to the SPA `index.html`
  shell as a 200. Create the file first, or the check is theater.
- **Supplying a Vite array option replaces its built-in default, it does not
  extend it.** This is how `server.fs.deny` silently stopped protecting
  `.git/` and `.npmrc` in an earlier draft. Re-list defaults explicitly.
- Claims about git state (what is tracked, what is on which branch) have a much
  shorter shelf life than claims about code. Re-check them rather than carrying
  them forward from earlier in a session.

## Git

- Do not commit or push unless asked. When committing, do not amend or rebase
  commits that are already pushed.
- The migration's rollback plan depends on each phase being a separate,
  independently revertible commit — do not squash phases together.
