# Backlog

Next ID: B18

Everything not done yet. One line per item; delete an item in the same commit
that completes it.

## Bugs

## Tech debt

- B3 `readVersion` in `src/index.ts` asks `<pm> --version` from the temp folder; with Corepack enabled, yarn may answer 1.x instead of the user's version, so the project is pinned to `yarn@1` and CI uses `--frozen-lockfile`. An unpinned yarn also gets `--immutable` in CI, which Yarn 1 rejects.
- B4 `packageManagerReplacements` in `src/scaffold.ts` writes `pnpm/action-setup@v6` into new projects' CI as a plain string, which Renovate does not track, while it does bump the same action in this repo's `ci.yml`; add a Renovate custom regex manager for it or read the version from one place.

## Ideas

- B6 `--framework react|preact`, built like `--browser-tests`: 7 of the 8 projects made from the generator add React or Preact by hand (Vite plugin, `jsx`, ESLint `react: true`, and the same Preact rule overrides).
- B17 `--tailwind` option (several of the user's Vite projects use Tailwind); after B6.
