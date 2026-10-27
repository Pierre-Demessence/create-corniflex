# create-corniflex

Scaffold a new **Vite + TypeScript** project from a single command, pre-wired
with the tooling used across these packages: Vite 8, TypeScript (strict),
Vitest, `@antfu/eslint-config` (flat config + custom perfectionist sorting), a
`@/` path alias, `brand.json` → `%APP_NAME%` HTML injection, and the standard
`.vscode` / `.github` / `docs` / `AGENTS.md` scaffolding.

## Usage

Once published to npm:

```sh
npm create corniflex@latest my-app
```

Straight from GitHub (no publish needed):

```sh
npx github:Pierre-Demessence/create-corniflex my-app
```

Local development of this generator:

```sh
npm install
npm run build
npm link            # exposes the `create-corniflex` bin globally
create-corniflex my-app
```

### Options

| Flag             | Description                                   |
| ---------------- | --------------------------------------------- |
| `[directory]`    | Target directory (prompted if omitted).       |
| `--no-git`       | Skip `git init`.                              |
| `--install`      | Install dependencies after scaffolding.       |
| `--skip-install` | Do not install dependencies.                  |
| `--pm <manager>` | Package manager: `npm` (default), `pnpm`, …   |

## How it works

`npm create corniflex` is an alias for `npm exec create-corniflex`. This package
exposes a `create-corniflex` bin that copies [template/](template/) into the
target directory, restores stored dotfiles (`_gitignore` → `.gitignore`), and
replaces the `{{PROJECT_NAME}}` (npm slug) and `{{PROJECT_TITLE}}` (display name)
tokens. See
[docs/plans/](docs/plans/) for design notes.
