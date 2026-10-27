# AGENTS.md

Agent operating notes for **{{PROJECT_TITLE}}**: a Vite + TypeScript (strict) app.

## Commands

- Dev server: `{{PM}} run dev`
- Build: `{{PM}} run build` (runs `tsc --noEmit`, then `vite build`)
- Lint: `{{PM}} run lint` / `{{PM}} run lint:fix`
- Test: `{{PM}} test` / `{{PM}} run test:watch` / `{{PM}} run test:coverage`

Run lint, test and build before considering work done.

## Layout

- `src/main.ts` — entry point; mounts into `#app`.
- `src/example.ts` / `src/example.test.ts` — sample module and test; replace them.
- `index.html` — Vite HTML entry; `%APP_NAME%` is replaced from `brand.json` at build time.
- `docs/` — `backlog.md` (everything not done, `B<n>` IDs), `decisions.md`
  (non-obvious decisions and why), `research/` (findings awaiting a decision;
  created when needed), `plans/` (work in progress, deleted when finished).

## Conventions

- Import from `@/…` instead of long relative paths.
- Co-locate tests with source as `<name>.test.ts`.
- 2-space indent, single quotes, semicolons (enforced by ESLint).
- ESLint (`@antfu/eslint-config`) sorts interface members with `id` and `name`
  first, and imports as one flat list; a comment line starts a new sorting
  partition.

## Invariants

- The app name comes from `brand.json`; never hard-code it in `index.html`.
