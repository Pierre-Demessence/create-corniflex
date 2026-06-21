# Tech stack

- **Language:** TypeScript (strict).
- **Build / dev server:** Vite.
- **Testing:** Vitest. Tests live next to source as `*.test.ts`.
  Scripts: `npm test` / `npm run test:watch` / `npm run test:coverage`.
- **Linting:** ESLint flat config via `@antfu/eslint-config` (TS config loaded
  with `jiti`). Scripts: `npm run lint` / `npm run lint:fix`.
- **Path alias:** `@/*` → `src/*` (kept in sync across `tsconfig.json`,
  `vite.config.ts`, and `vitest.config.ts`).
- **Branding:** the `name` in `brand.json` is injected into `index.html` via the
  `%APP_NAME%` placeholder at build time.
- **Package manager:** npm.
- **Minimum Node:** 20+.
