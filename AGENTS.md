# AGENTS.md

Agent operating notes for **create-corniflex**: a CLI (`npx create-corniflex <dir>`) that scaffolds a Vite + TypeScript project from `template/`. It is a generator, not an app: the product is the project it writes.

## Commands

- Build: `npm run build` (tsdown, `src/index.ts` to `dist/index.js`, shebang kept)
- Lint: `npm run lint` / `npm run lint:fix`
- Test: `npm test` (`node --test tests/*.test.ts`; Node strips the types)
- Smoke: `npm run smoke -- --pm <npm|pnpm|yarn> [generator flags]` builds, scaffolds into a temp folder, installs, lints with zero warnings, tests and builds. It stops at the first failing step and keeps the folder; on success it deletes it.
- Run the generator by hand: `node dist/index.js <dir> --yes --no-git --skip-install`

There is no typecheck script; `tsc --noEmit` checks `src/`, `tests/` and `scripts/`. Run lint, test and (for any change under `template*/` or `src/`) smoke before considering work done.

## Layout

- `src/index.ts`: CLI flow. Parses flags with commander, decides `interactive` (`--yes` off and a TTY on stdin and stdout), asks or applies defaults, scaffolds, then runs git init and install. Known user errors go through `fail()` (one line, exit 1); nothing is written before the target folder is validated.
- `src/scaffold.ts`: the helpers, all exported for tests: `copyTemplate` and its token filling, `scaffoldReplacements` (every token, built from the CLI options), the browser-tests overlay, package-manager pinning and yarn config, folder checks (`isDirEmpty`, `existingTemplateFiles`).
- `template/`: the files every project gets.
- `template-browser-tests/`: overlay for `--browser-tests` (a `package.json` holding only extra devDependencies, plus `src/`).
- `scripts/smoke.ts`: the smoke check, run by plain `node`. CI's `template` job calls it.
- `tests/`: `scaffold.test.ts` (helpers and template content), `cli.test.ts` (spawns `src/index.ts` with no terminal, so no build is needed).
- `docs/`: `backlog.md` (everything not done, `B<n>` IDs, `Next ID:` line), `plans/` (work in progress, deleted when finished). No `decisions.md` yet.

## Template rules

- **Tokens.** A text file under `template*/` may contain `{{NAME}}`. `copyTemplate` fills it from `scaffoldReplacements`. A token alone on its line expands to several lines (indented like the token) or, when empty, drops the line. A new token must be added to `scaffoldReplacements`; a test fails on any token it does not produce.
- **Text files.** Only extensions in `TEXT_EXTENSIONS` (and the renamed dotfiles) are filled; anything else is copied as it is. Add an extension there before using tokens in it.
- **Dotfiles.** npm treats a literal `.gitignore` in a package as ignore rules, so such a file is stored as `_gitignore` and restored by `DOTFILE_RENAMES`. Store another dotfile with the `_` prefix only if `npm pack --dry-run` drops it, and register it in `DOTFILE_RENAMES`.
- **Overlay `package.json`.** It lists only the extra `dependencies` and `devDependencies`, so Renovate tracks them here. `addBrowserTests` merges them into the project's `package.json`, sorted.
- **Versions.** Pin a version that has been published for at least 7 days (`renovate.json` sets `minimumReleaseAge: 7 days`). Check the registry; do not rely on memory.
- **Published files.** New template or overlay folders must be added to `files` in `package.json`.

## Invariants

- `template/` and `template-browser-tests/` are excluded from this repo's lint and typecheck: they reference dependencies that are not installed here. `npm run smoke` is their check.
- Every generator flag that changes the output has an entry in the CI `template` matrix (`.github/workflows/ci.yml`), which runs smoke.
- Without a terminal, the CLI never prompts and never hangs: it needs a directory, refuses a non-empty folder without `--overwrite`, and installs only with `--install`.
- The CLI is ESM, Node 22 or later; `.tool-versions` and `engines` match the template's Node range.
- Source uses only syntax Node can strip (`erasableSyntaxOnly`), so tests and the smoke script run without a build step.
- Style is enforced by ESLint (`@antfu/eslint-config`: 2-space indent, single quotes, semicolons). Comments explain why.
