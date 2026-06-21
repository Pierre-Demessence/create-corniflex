---
last-updated: 2026-06-21
applicable: ['**']
owner: Pierre Demessence
---

# Agent operational notes

Concise instructions for AI agents working in this repository.

## Commands

- Dev server: `npm run dev`
- Build: `npm run build` (runs `tsc --noEmit` then `vite build`)
- Lint: `npm run lint` / `npm run lint:fix`
- Test: `npm test` / `npm run test:watch`

## Invariants

- Keep the `@/*` alias in sync across `tsconfig.json`, `vite.config.ts`, and
  `vitest.config.ts` if you change it.
- The app name comes from `brand.json`; do not hard-code it in `index.html`.
- Run the static pipeline (lint + test + build) before considering work done.
