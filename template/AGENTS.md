# AGENTS.md

Agent operating notes for **{{PROJECT_TITLE}}**: a Vite + TypeScript (strict) app.

## Commands

- Dev server: `npm run dev`
- Build: `npm run build` (runs `tsc --noEmit`, then `vite build`)
- Lint: `npm run lint` / `npm run lint:fix`
- Test: `npm test` / `npm run test:watch` / `npm run test:coverage`

Run lint, test and build before considering work done.

## Layout

- `src/main.ts` — entry point; mounts into `#app`.
- `src/example.ts` / `src/example.test.ts` — sample module and test; replace them.
- `index.html` — Vite HTML entry; `%APP_NAME%` is replaced from `brand.json` at build time.
- `docs/` — `backlog.md` (everything not done), `decisions.md` (non-obvious
  decisions and why), `plans/` (work in progress).

## Conventions

- Import from `@/…` instead of long relative paths.
- Co-locate tests with source as `<name>.test.ts`.
- 2-space indent, single quotes, semicolons (enforced by ESLint).
- ESLint (`@antfu/eslint-config`) sorts object and interface keys with `id` and
  `name` first, and imports as one flat list; a comment line starts a new
  sorting partition. Tests must not depend on object key order.
- `import-x/no-unresolved` checks every import, including the `@/` alias.

## Invariants

- Keep the `@/*` alias in sync across `tsconfig.json`, `vite.config.ts` and
  `vitest.config.ts`.
- The app name comes from `brand.json`; never hard-code it in `index.html`.
