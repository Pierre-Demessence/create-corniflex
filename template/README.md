# {{PROJECT_TITLE}}

A Vite + TypeScript app scaffolded with
[create-corniflex](https://github.com/Pierre-Demessence/create-corniflex).

## Getting started

```sh
{{PM}} install
{{PM}} run dev
```

## Scripts

| Script                  | Description                           |
| ----------------------- | ------------------------------------- |
| `{{PM}} run dev`           | Start the Vite dev server.            |
| `{{PM}} run build`         | Type-check, then build for production.|
| `{{PM}} run preview`       | Preview the production build.         |
| `{{PM}} run lint`          | Lint with ESLint.                     |
| `{{PM}} run lint:fix`      | Lint and auto-fix.                    |
| `{{PM}} test`              | Run Vitest once.                      |
| `{{PM}} run test:watch`    | Run Vitest in watch mode.             |
| `{{PM}} run test:coverage` | Run Vitest with coverage.             |

## Dependency updates

[renovate.json](renovate.json) keeps dependencies, Node (`.tool-versions`) and
the `packageManager` pin current, waiting 7 days after each release. It takes effect
once the [Renovate GitHub app](https://github.com/apps/renovate) is installed on
the repository.

Project docs: [docs/backlog.md](docs/backlog.md) and [docs/decisions.md](docs/decisions.md). Agent notes: [AGENTS.md](AGENTS.md).
