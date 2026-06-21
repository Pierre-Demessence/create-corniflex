# create-corniflex scaffolder

Goal: a `create-*` initializer so `npm create corniflex my-app` (and
`npx github:Pierre-Demessence/create-corniflex my-app`) scaffolds a fresh
Vite + TypeScript project matching the "ideal" architecture used by SpaceShooter.

## Decisions

- **Initializer name:** `corniflex` → package `create-corniflex`.
- **Distribution:** local-first (`npm link`), but publish-ready so the same
  package also works via `npx github:<repo>` and a future `npm publish`.
- **Template stack:** vanilla TypeScript (no UI framework) — Vite 8 + TS strict +
  Vitest 4 (jsdom) + `@antfu/eslint-config` (flat, TS, perfectionist sorting),
  `@/` path alias, `brand.json` → `%APP_NAME%` HTML injection.
- **Scaffolder UX:** interactive-lite — prompt for directory, confirm `git init`,
  optionally install deps. Flags override prompts (`--no-git`, `--install`).

## Build notes / invariants

- Template ships inside the package via `files: ["dist/", "template/"]`.
- The template's `.gitignore` is stored as `template/_gitignore` and renamed on
  copy — npm strips/renames a literal `.gitignore` inside a published package
  (the create-react-app gotcha).
- `template/**` must be excluded from the CLI's own eslint + tsconfig so its
  configs (which reference uninstalled deps) are never linted/typechecked.
- Bin resolves the template at runtime via `import.meta.url` → `../template`.

## Checklist

- [x] Plan file written
- [x] CLI package scaffolded (package.json, tsconfig, tsup, eslint, src/)
- [x] `src/scaffold.ts` — slugify + copy + `_gitignore` rename + token replace
- [x] `src/index.ts` — commander args + clack prompts + git/install
- [x] Vanilla-TS `template/` tree (configs, src, docs, .vscode, .github)
- [x] Smoke test (`tests/scaffold.test.ts`)
- [x] Deps installed; build + lint + test green
- [x] End-to-end scaffold into a temp dir verified (`npm install` + build there)
- [x] Linked globally; direct-bin flow verified; `npm create` confirmed to
  require publishing (resolves from registry, not the global link)
- [x] Peer review clean (LGTM); follow-up polish applied + re-validated
