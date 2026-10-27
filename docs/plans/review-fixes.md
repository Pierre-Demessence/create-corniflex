# B1, B5–B16 Review fixes

**Goal:** the generator works when an agent runs it, protects existing files, can be checked locally the way CI checks it, and makes React or Preact projects whose config files are type-checked and linted with type information.

**Status:** approved with decisions 1–4 as recommended; next B9. B6 waits for `template-refresh` T2 (antfu 10, not before 2026-10-30).

## Decisions (approved)

1. With a terminal and no `--framework`, the CLI asks which framework (default vanilla), like create-vite. Without a terminal: vanilla.
2. Preact projects start on Preact 11 (11.0.0 published 2026-09-30; the user's games are on 10), with `@preact/signals` (6 of 7 Preact games use it).
3. React and Preact projects ship a sample component test with Testing Library.
4. Without a terminal, a non-empty folder stops the run with an error unless `--overwrite` is passed.

Dependencies approved with this plan: generator devDependency `tsdown` (replaces `tsup` and `tsx`); template devDependency `@types/node`; the React and Preact overlay packages listed in Design "Frameworks".

## Acceptance criteria

1. WHEN the CLI runs without a terminal and with a directory, it scaffolds with the defaults (git on unless `--no-git`, no install unless `--install`, vanilla unless `--framework`) and exits 0. Check: generator test spawning `node src/index.ts` with stdin ignored.
2. WHEN it runs without a terminal and without a directory, or into a non-empty folder without `--overwrite`, it prints one error line, writes nothing and exits 1. Check: spawn tests.
3. WHEN a prompt is cancelled, the exit code is 1; WHEN `--yes` is passed, no prompt appears. Check: manual run in a terminal.
4. WHEN the folder holds only `.git`, it counts as empty; WHEN an interactive run targets a non-empty folder, the question lists the files that would be overwritten. Check: unit tests.
5. WHEN a template or overlay file contains `{{NAME}}`, the file is one `copyTemplate` fills and `NAME` is a token `scaffoldReplacements` produces. Check: unit test over the template sources.
6. WHEN `npm run smoke -- --pm <pm> [generator flags]` runs, it scaffolds, installs, lints with zero warnings, tests and builds, and exits non-zero on the first failing step, keeping the folder; CI's template job runs exactly this. Check: local run for npm and pnpm; CI run after push.
7. WHEN the generator is built and tested, it uses tsdown and `node --test`, declares the template's Node range, and `node dist/index.js --version` works. Check: commands in B1 B14.
8. WHEN a project is scaffolded, it has `.gitattributes` (`* text=auto eol=lf`), antfu's recommended `.vscode/settings.json` and a `src/style.css` whose color tokens follow the OS dark mode. Check: generator tests; browser check of the scaffolded page in light and dark.
9. WHEN `vite.config.ts` or `eslint.config.ts` has a type error, `build` fails; WHEN `src` has an un-awaited promise, `lint` fails; `@/` still resolves in Vite, Vitest, `tsc` and the editor from one `paths` entry. Check: smoke run plus deliberate errors in a scratch copy.
10. WHEN `--framework react|preact` is passed, the project renders `App` from `src/main.tsx`, has a passing component test, React lint rules (with the Preact overrides for Preact) and passes the smoke run. Check: generator tests; smoke per framework locally and in CI.
11. WHEN an agent opens this repo, `AGENTS.md` (under 200 lines) gives the commands, layout, token rules and the smoke check. Check: review.

## Design

- **No terminal (B5):** `interactive = !opts.yes && stdin.isTTY && stdout.isTTY`. Not interactive: directory required, `git` from `--no-git`, install only with `--install`, framework from `--framework` or vanilla, non-empty folder only with `--overwrite`. Known user errors use `cancel(message)` and exit 1, never a stack trace; `abort` exits 1. Interactive prompts are unchanged.
- **Folders (B13):** `isDirEmpty` ignores `.git`. The interactive confirm names the template files that already exist in the target (up to 10, then "and N more").
- **Tokens (B12):** `scaffoldReplacements(options)` in `src/scaffold.ts` builds every token from the CLI options (moved out of `main`); `main` and the tests use it. `isTextFile` is exported. The test walks `template/` and every `template-*/` overlay.
- **Smoke (B10):** `scripts/smoke.ts`, run by plain `node` (Node 24 strips types); `"smoke": "npm run build && node scripts/smoke.ts"`. It forwards unknown flags to the generator with `--yes --no-git --skip-install`, passes `--max-warnings 0` to lint (`--` for npm only), installs Chromium (with `--with-deps` when `CI` is set) for `--browser-tests`, and deletes the temp folder on success. The CI `template` job keeps its package manager setup steps and replaces the scaffold-to-build steps with one smoke call.
- **Toolchain (B1, B14):** `engines` and a root `.tool-versions` (`nodejs 24`) match the template; the CI generator job reads the root file. `tsdown` `^0.23.1` with `platform: 'node'`, target `node22`, ESM, shebang kept. `"test": "node --test tests/*.test.ts"`; `tsx` and `tsup` removed; tsconfig gains `erasableSyntaxOnly` and `verbatimModuleSyntax` so `tsc` rejects syntax Node cannot strip.
- **Template files (B11, B15, B16):** `template/.gitattributes`, stored as `_gitattributes` only if `npm pack --dry-run` drops it. `.vscode/settings.json` takes antfu's recommended block (format on save off, `fixAll.eslint` explicit, `organizeImports` never, stylistic rules silenced but auto-fixed, `eslint.validate` limited to js/ts/jsx/tsx/json/jsonc/yaml) and keeps its exclude, EOL, tab size and tsdk keys. `src/style.css`: `color-scheme: light dark`, `--color-bg`, `--color-text`, `--color-muted`, `--color-accent` redefined under `prefers-color-scheme: dark`, body using them; imported by the entry. Template `AGENTS.md` gains: colors come from these tokens, never hard-coded.
- **Checked configs (B7, B8):** create-vite 9.3.1's react-ts layout: solution-style `tsconfig.json` referencing `tsconfig.app.json` (today's options plus `tsBuildInfoFile`, include `src`, owns `paths`) and `tsconfig.node.json` (create-vite's node config plus `strict`, include `vite.config.ts` and `eslint.config.ts`). `@types/node` `^24.19.2` (matches `.tool-versions`). `"build": "tsc -b && vite build"`. ESLint `typescript: { tsconfigPath: 'tsconfig.json' }`; antfu's project service finds each file through the references. If Vite's `resolve.tsconfigPaths` does not follow the references, pick the smallest change that keeps one `paths` entry and log it. Template `AGENTS.md` and README build lines follow.
- **Frameworks (B6):** `--framework <vanilla|react|preact>` (commander choices; prompt per question 1). Overlays `template-react/` and `template-preact/`, like `template-browser-tests/`: a `package.json` with `dependencies` and `devDependencies` (tracked by Renovate) and `src/main.tsx`, `src/App.tsx`, `src/App.test.tsx`. `addBrowserTests` becomes `addOverlay` (merges both maps, sorted; copies `src/`); the framework run removes `src/main.ts`. Own-line tokens: plugin import and call (first in `plugins`), `"jsx": "react-jsx"` (plus `"jsxImportSource": "preact"`) in `tsconfig.app.json`, `react: true` and the Preact rule block in `eslint.config.ts`, the entry path in `index.html`, framework lines in README and `AGENTS.md`. Test `include` becomes `src/**/*.test.{ts,tsx}` and coverage `src/**/*.{ts,tsx}` minus tests and `src/main.{ts,tsx}` for every project. Template `renovate.json` gains a React group (`react`, `react-dom`, `@types/react*`).
  - React: `react`, `react-dom` `^19.3.1`; dev `@types/react`, `@types/react-dom` `^19.3.0`, `@vitejs/plugin-react` `^6.1.2`, `@eslint-react/eslint-plugin` `^5.28.3`, `eslint-plugin-react-refresh` `^0.5.7`, `@testing-library/react` `^16.3.3`, `@testing-library/dom` `^10.4.2`. Entry: `createRoot` on `#app` inside `StrictMode`.
  - Preact: `preact` `^11.0.1`, `@preact/signals` `^2.11.3`; dev `@preact/preset-vite` `^2.10.6`, `@eslint-react/eslint-plugin` `^5.28.3`, `eslint-plugin-react-refresh` `^0.5.7`, `@testing-library/preact` `^3.2.4`. Entry: `render(<App />, root)`. Rules off, each with its comment from `Games/SpaceShooter/eslint.config.ts`: `react-refresh/only-export-components` (Prefresh, not React Refresh), `react/exhaustive-deps` (signals are stable), `react/no-context-provider` and `react/no-use-context` (React 19 APIs).
  - `App` shows `greeting()` and a click counter; `App.test.tsx` clicks it with `afterEach(cleanup)` (no Vitest globals).
  - antfu 8 wants `@eslint-react` 3 and antfu 10 wants 5, hence the wait for T2.
- **Repo AGENTS.md (B9):** commands, layout (CLI flow, helpers, template and overlays, smoke script, tests), token rules, `_` dotfiles, overlay `package.json` files, the 7-day release-age rule for versions, invariants (`template/` is not linted here, `npm run smoke` is its check, every flag gets a CI matrix entry), docs map.

## Checklist

Each item: implement, run `npm run lint`, `npm test` and the smoke runs it names, review (`reviewer` agent), delete its backlog entries, one local commit `feat: <IDs> …` (plan file in the first).

- [x] **B5 B13 Runs without a terminal, safe folders.** `src/index.ts`, `src/scaffold.ts` (`isDirEmpty`, overwrite listing), tests per criteria 1–4, README options table (`--yes`, `--overwrite`).
  Visible after: an agent's `npx S:/Dev/Web/Packages/create-corniflex <dir>` creates the project instead of crashing.
  Needs you: press Ctrl+C at the first prompt and check the exit code is 1; run with `--yes` in a terminal and see no question (at the end).
- [x] **B10 Smoke script.** `scripts/smoke.ts`, `package.json` script, `.github/workflows/ci.yml` template job. Run it for npm and pnpm, plus npm `--browser-tests`.
  Visible after: `npm run smoke -- --pm pnpm` checks a new project locally.
  Needs you: push to see the CI run (at the end).
- [x] **B1 B14 Generator toolchain.** `package.json`, `.tool-versions`, `tsdown.config.ts` (delete `tsup.config.ts`), `tsconfig.json`, CI generator job. Check `node dist/index.js --version`, the shebang on line 1 of `dist/index.js`, and `npm pack --dry-run`.
  Visible after: nothing: same CLI, newer build tools.
  Needs you: nothing.
  Decided during the run: tsconfig `target` goes from ES2022 to ES2023 and tsdown gets `fixedExtension: false`. Why: `toSorted` (already used in `src/`) failed `tsc` under ES2022, and Node 22+ supports ES2023; tsdown otherwise emits `dist/index.mjs`, which the `bin` path `dist/index.js` does not match. Alternative: keep ES2022 and avoid `toSorted`, or point `bin` at `.mjs`. Change: edit `tsconfig.json` / `tsdown.config.ts`.
- [x] **B12 Token check.** `src/scaffold.ts`, `src/index.ts`, tests switched to `scaffoldReplacements`.
  Visible after: nothing: a mistyped token now fails the tests.
  Needs you: nothing.
- [x] **B11 B15 B16 Template files.** As in Design; smoke for npm; browser check of the scaffolded page in light and dark.
  Visible after: new projects get LF line endings, quieter editor formatting and a page that follows the OS dark mode.
  Needs you: open a scaffolded project's page in both OS themes (at the end).
- [x] **B7 B8 Checked configs.** Template tsconfigs, `package.json`, `eslint.config.ts`, `AGENTS.md`, README, generator tests reading `tsconfig.json`; smoke for npm and npm `--browser-tests`; deliberate errors per criterion 9.
  Visible after: a type error in `vite.config.ts` fails the build; lint catches un-awaited promises.
  Needs you: nothing.
- [ ] **B9 Repo AGENTS.md.** As in Design.
  Visible after: nothing: agent notes only.
  Needs you: nothing.
- [ ] **B6 Frameworks** (not before `template-refresh` T2 is committed; otherwise skipped). As in Design; generator tests; smoke for npm with each framework and pnpm with React; CI matrix entries; generator README; repo `AGENTS.md`.
  Visible after: `--framework react` or `preact` (or the new question) makes a ready React or Preact project.
  Needs you: run `npm run dev` in a React and a Preact project, edit `App.tsx` and check the page updates without losing the counter (at the end).
