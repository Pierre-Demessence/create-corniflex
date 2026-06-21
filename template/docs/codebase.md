# Codebase map

- `src/` — application source.
  - `main.ts` — entry point; mounts into `#app`.
  - `example.ts` / `example.test.ts` — sample module and Vitest test; replace these.
- `index.html` — Vite HTML entry; `%APP_NAME%` is replaced from `brand.json`.
- `vite.config.ts` / `vitest.config.ts` — build and test config; both share the `@/` alias.
- `eslint.config.ts` — flat ESLint config.
- `docs/` — project documentation (start at [INDEX.md](INDEX.md)).

## Conventions

- Import from `@/…` instead of long relative paths.
- Co-locate tests with source as `<name>.test.ts`.
- 2-space indent, single quotes, semicolons (enforced by ESLint).
