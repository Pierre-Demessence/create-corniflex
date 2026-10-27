# Backlog

Next ID: B18

Everything not done yet. One line per item; delete an item in the same commit
that completes it.

## Bugs

## Tech debt

- B1 The generator still targets Node 20 (`engines` in `package.json`, `target` in `tsup.config.ts`) while the template requires Node 22.22+; align them.
- B3 `readVersion` in `src/index.ts` asks `<pm> --version` from the temp folder; with Corepack enabled, yarn may answer 1.x instead of the user's version, so the project is pinned to `yarn@1` and CI uses `--frozen-lockfile`. An unpinned yarn also gets `--immutable` in CI, which Yarn 1 rejects.
- B4 `packageManagerReplacements` in `src/scaffold.ts` writes `pnpm/action-setup@v6` into new projects' CI as a plain string, which Renovate does not track, while it does bump the same action in this repo's `ci.yml`; add a Renovate custom regex manager for it or read the version from one place.
- B7 `template/tsconfig.json` includes only `src` and the template lacks `@types/node`, so `vite.config.ts` has three type errors (`node:fs`, `node:path`, `import.meta.dirname`) that no check reports; add a Node tsconfig for the config files, like create-vite's app/node split.
- B8 Type-aware lint rules are off: `template/eslint.config.ts` passes `typescript: true` without `tsconfigPath`. Needs B7, so every linted file belongs to a tsconfig.
- B9 This repo has no `AGENTS.md`: the token rules (`applyReplacements` in `src/scaffold.ts`), `TEXT_EXTENSIONS`, `_`-prefixed dotfiles, `template/` being excluded from lint, and the scaffold CI job as the real check are only discoverable from the code.
- B10 The scaffold check (install, lint, test and build per package manager) exists only in the `template` job of `.github/workflows/ci.yml`; a script that CI also calls would let it run locally.
- B11 The template has no `.gitattributes`; with `core.autocrlf=true` on Windows, new projects get CRLF checkouts and mixed line endings from multi-line edits, which this repo's `.gitattributes` prevents here.
- B12 `copyTemplate` in `src/scaffold.ts` silently leaves a misspelled token, or a token in a file whose extension is not in `TEXT_EXTENSIONS`, as a literal `{{X}}`; fail on any leftover token.
- B14 tsup is no longer maintained (its README points to tsdown); with B1, build with tsdown and run the tests with `node --test` instead of `tsx`, since Node 22.22+ runs TypeScript files directly.
- B15 `template/.vscode/settings.json` differs from `@antfu/eslint-config`'s recommended editor settings: it formats on save and has no `eslint.validate` list.

## Ideas

- B6 `--framework react|preact`, built like `--browser-tests`: 7 of the 8 projects made from the generator add React or Preact by hand (Vite plugin, `jsx`, ESLint `react: true`, and the same Preact rule overrides).
- B16 A starter `src/style.css` with color tokens and a dark variant, so new projects start with theme tokens.
- B17 `--tailwind` option (several of the user's Vite projects use Tailwind); after B6.
