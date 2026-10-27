# Template refresh

**Goal:** a project made with `create-corniflex` starts on current tool versions, with less config to keep in sync, a CI that proves the template still works, and docs that follow the user's current rules.

**Status:** decisions 1–3 approved as recommended; T1, T3, T4, T5 and T6 done; next T7 (T2 waits for 2026-10-30). Source: hand-off in `I:/Dev/AI/.agents/docs/plans/instructions-review.md`. Versions checked with `npm view` and `gh api` on 2026-10-27.

## Verified versions

The user's npm config sets `min-release-age = 7`, so the newest installable release is the one published on or before 2026-10-20. Ranges below use that release as the floor.

| Package | Template now | Use | Note |
| --- | --- | --- | --- |
| `typescript` | `~5.9.3` | `~6.0.3` | Latest is 7.0.2, but typescript-eslint 8.72.1 declares `typescript <6.1.0` |
| `vitest`, `@vitest/coverage-v8` | `^4.1.2` | `^5.0.5` | Node `^22.12 \|\| ^24 \|\| >=26`; peer `vite ^6.4 \|\| ^7 \|\| ^8` |
| `jsdom` | `^29.0.1` | `^30.1.3` | Node `^22.22.2 \|\| ^24.15.0 \|\| >=26` |
| `@antfu/eslint-config` | `^8.0.0` | `^10.0.0` | 10.0.0 published 2026-10-23: **not installable before 2026-10-30**; newest eligible is 9.5.1. 10 turns on `antfu/reasonable-newline` (formatting changes) |
| `vite` | `^8.0.3` | `^8.3.4` | 8.3.5 is 6 days old |
| `eslint` / `jiti` | `^10.2.0` / `^2.6.1` | `^10.13.0` / `^2.7.0` | |
| `actions/checkout`, `actions/setup-node` | `v4` | `v7` | Latest releases v7.0.1 and v7.1.0; both published 2026-07 / 2026-10-08 |
| Node `engines` | `^20.19.0 \|\| >=22.12.0` | `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0` | Node 20 is end of life; the range is jsdom 30's, the strictest of the stack |

## Open decisions (resolved on approval)

1. **Layout tests.** jsdom computes no layout (sizes, overlaps, wrapping). Recommendation: keep jsdom as the default for unit tests and add real-browser tests (Vitest browser mode, Playwright) as opt-in through a `--browser-tests` flag, since the default would add a browser download to every install and every CI run. T9 is built only if you agree.
2. **Staying current.** Recommendation: Renovate (`renovate.json`), since it also updates `.tool-versions` and `packageManager` and can apply a 7-day release delay like the user's npm config. Dependabot can't update `.tool-versions`. Cost: the Renovate GitHub app must be installed on each new repo.
3. **`bun` in `--pm`.** Setup-node can't install or cache it, and CI would need a separate action. Recommendation: drop `bun` from the choices (`npm`, `pnpm`, `yarn` stay). The generator isn't published yet, so nothing breaks.

## Acceptance criteria

1. WHEN a project is scaffolded and its package manager installs it, install, `lint`, `test` and `build` succeed with zero errors and zero warnings. Check: T8's CI job and the manual run in each item.
2. WHEN `package.json` is read, it lists the versions of the table above (antfu per T2) and no `import-x` packages. Check: a generator test on the scaffolded `package.json`.
3. WHEN a file imports from `@/…`, Vite, Vitest and `tsc` resolve it from the single `tsconfig.json` `paths` entry. Check: `example.test.ts` imports through `@/`; `npm test` and `npm run build` pass.
4. WHEN `--pm pnpm|yarn` is passed, the scaffolded README, `AGENTS.md` and CI contain that manager's commands and no `npm run` / `npm ci` text. Check: a generator test per manager.
5. WHEN code indexes an array or record without a check, `tsc` reports it. Check: build passes on the template, and a deliberate unchecked index in a scratch copy fails it.
6. WHEN the generator's CI runs, it scaffolds a project and runs its lint, test and build. Check: a green run on GitHub, and a red one when the template is deliberately broken in a scratch branch.
7. WHEN a project is scaffolded, it contains no `CLAUDE.md`, no `eslint.useFlatConfig` setting, and a `docs/backlog.md` with `Next ID:` and `B<n>` wording; this repo has no `docs/plans/done/`. Check: generator test plus `git ls-files`.

## Design

- **ESLint:** `perfectionist/sort-objects` is removed (object key order is iteration order; `sort-imports` and `sort-interfaces` stay, with `id`/`name` first for interfaces). `eslint-plugin-import-x`, `eslint-import-resolver-typescript` and `import-x/no-unresolved` are removed: `tsc --noEmit` already checks imports, and typescript-eslint advises turning import resolution rules off for TypeScript. `AGENTS.md` loses the key-order and `no-unresolved` lines.
- **Alias:** `resolve.tsconfigPaths: true` in `vite.config.ts` (Vite 8), which imports `defineConfig` from `vitest/config` and holds the `test` block; `vitest.config.ts` is deleted, and so is the `AGENTS.md` invariant about keeping three copies in sync.
- **Package manager:** replacement tokens in the template (`{{PM}}`, run, install-in-CI commands) filled by `scaffold.ts` from `--pm`. CI uses `pnpm/action-setup` before setup-node for pnpm, and `corepack enable` for yarn.
- **Pins:** `.tool-versions` with the Node major (`node 24`, to be checked against what mise and setup-node's `node-version-file` accept), and `packageManager` written at scaffold time from `<pm> --version` (omitted if the manager isn't installed). CI reads Node from `.tool-versions`.
- **Docs:** the template's `docs/` follows `docs.instructions` (`B<n>` IDs, `Next ID:` line, `docs/research/` mentioned in `AGENTS.md`'s docs map). `.gitkeep` stays in `docs/plans/`.
- **Failure modes:** an install that the release-age gate refuses (T2) is the signal to wait, not to loosen the range; `--pm` with an unavailable manager scaffolds without `packageManager` and says so.

## Checklist

Each item: edit, scaffold into a scratch folder and run install, lint, test, build, then this repo's `npm run lint` and `npm test`; review before its commit (`reviewer` agent); one local commit with the item ID (`feat(template): T1 …`), plan file included in the first. Items are in order; T2 waits for a date.

- [x] **T1 Versions and engines.** `template/package.json` (all rows of the table except antfu), `ci.yml` actions to `v7`, `engines`, `README.md` text naming Vite/Node versions if any. Fix whatever the new majors break in `example.test.ts` or configs.
  Visible after: new projects install Vitest 5, TypeScript 6.0, jsdom 30 and need Node 22.22+.
  Needs you: nothing.
- [ ] **T2 antfu 10** (not before 2026-10-30). Bump to `^10.0.0`, re-run `lint:fix` on the template files so they satisfy `reasonable-newline`, confirm `npm view @antfu/eslint-config@10.0.0 time` is at least 7 days old first. If you want it sooner, use `^9.5.1` and add a backlog entry.
  Visible after: new projects lint with ESLint config 10.
  Needs you: nothing.
- [x] **T3 ESLint trim.** Design "ESLint"; also the generator `README.md` line naming `import-x`.
  Visible after: no import resolver in new projects; objects are no longer reordered by `lint:fix`.
  Needs you: nothing.
- [x] **T4 Single alias.** Design "Alias"; `example.test.ts` imports via `@/`.
  Visible after: one fewer config file in new projects.
  Needs you: nothing.
- [x] **T5 Small cleanups.** `noUncheckedIndexedAccess` in `tsconfig.json`; delete `template/CLAUDE.md`; drop `eslint.useFlatConfig` from `.vscode/settings.json`; delete this repo's `docs/plans/done/` (its content stays in git history).
  Visible after: stricter array indexing errors in new projects.
  Needs you: nothing.
- [x] **T6 Package manager and pins.** Design "Package manager" and "Pins"; `src/index.ts` choices per decision 3; generator tests for criteria 2 and 4.
  Visible after: `--pm pnpm` yields pnpm commands everywhere, plus `.tool-versions` and `packageManager`.
  Needs you: nothing.
- [ ] **T7 Template docs.** Design "Docs".
  Visible after: new projects' backlog uses `B<n>` and `Next ID:`.
  Needs you: nothing.
- [ ] **T8 Keeping current.** Per decision 2: `renovate.json` (7-day delay, groups for ESLint and Vitest packages) or `.github/dependabot.yml`; a `.github/workflows/ci.yml` in this repo that builds the generator, scaffolds a project for each manager and runs its lint, test and build.
  Visible after: update pull requests appear in new projects once the bot is installed; a break in the template turns this repo's CI red.
  Needs you: install the Renovate app on new repos (and on this one); push to see the CI run (no pushing by the agent).
- [ ] **T9 Browser tests** (only if decision 1 is agreed). `--browser-tests` adds `@vitest/browser-playwright`, `playwright`, a second Vitest project for `*.browser.test.ts`, a sample layout test, `npx playwright install --with-deps chromium` in CI, and a line in `AGENTS.md`.
  Visible after: `--browser-tests` projects can assert real element sizes.
  Needs you: nothing.
- [ ] **T10 Final review and finish.** Review against all criteria; move decisions that pass the `docs/decisions.md` test there (this repo has none yet); delete the plan in the last commit, naming its path.
  Visible after: nothing: it only checks.
  Needs you: nothing.
