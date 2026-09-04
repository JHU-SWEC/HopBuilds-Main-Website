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

## Migration landed — re-check state before trusting docs

The Vite migration described in
[`docs/design/vite-migration.md`](./docs/design/vite-migration.md) has landed.
That doc is now a historical record, not a standing checklist, though it still
records rejected alternatives so they aren't re-proposed. Don't assume a
remembered build/module detail still holds — re-check current git state and
the actual code before relying on it.

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
- A green build and an approving code review can't catch defects that live in
  the interaction between two individually-correct files — see AGENTS.md's
  known gotchas for the worked example. Load the page before calling
  rendering work done.

## Git

- Do not commit or push unless asked. When committing, do not amend or rebase
  commits that are already pushed.
- **On the branch:** each Vite migration phase on `miles/vite-migration` stays
  its own separate, independently revertible commit — do not squash phase
  commits together. This governs the branch's own internal history.
- **At cutover:** the branch must land on `main` as exactly one revertable
  commit — either a true two-parent merge commit or a single squashed commit.
  This does not contradict the bullet above: it concerns the merge onto `main`,
  not the branch's internal history. Never land it via "Rebase and merge" or
  any rebase-then-fast-forward — `git revert -m 1` against linear history exits
  0 while reverting only the tip, i.e. a silent partial rollback. The rollback
  plan reverts the migration as one atomic unit, not phase by phase.
