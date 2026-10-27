# create-corniflex

Scaffold a new **Vite + TypeScript** project from a single command, pre-wired
with the tooling used across these packages: Vite 8, TypeScript (strict),
Vitest, `@antfu/eslint-config` (flat config + custom perfectionist sorting), a
`@/` path alias, `brand.json` → `%APP_NAME%` HTML injection, a Renovate config
for dependency updates, and the standard `.vscode` / `.github` / `docs` /
`AGENTS.md` scaffolding.

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

CI scaffolds a project with each package manager and runs its install, lint,
test and build, so a template change that breaks new projects fails the build.

### Options

| Flag             | Description                                   |
| ---------------- | --------------------------------------------- |
| `[directory]`    | Target directory (prompted if omitted).       |
| `--no-git`       | Skip `git init`.                              |
| `--install`      | Install dependencies after scaffolding.       |
| `--skip-install` | Do not install dependencies.                  |
| `--pm <manager>` | `npm` (default), `pnpm` or `yarn`.            |

`--pm` also fills the manager's commands into the project's README, `AGENTS.md`
and CI, and writes its installed version to `packageManager` (skipped with a
warning when the manager isn't installed).

## How it works

`npm create corniflex` is an alias for `npm exec create-corniflex`. This package
exposes a `create-corniflex` bin that copies [template/](template/) into the
target directory, restores stored dotfiles (`_gitignore` → `.gitignore`), and
replaces the `{{PROJECT_NAME}}` (npm slug), `{{PROJECT_TITLE}}` (display name)
and package-manager tokens. See
[docs/plans/](docs/plans/) for design notes.
