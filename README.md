# Oxneer UI

Frontend for the Oxneer auction platform: a Next.js (App Router) app in an npm workspaces + Turborepo monorepo. The backend API is a separate service (default `http://localhost:8090`, set with `NEXT_PUBLIC_API_URL`).

## Requirements

- Node.js 24 (see `.nvmrc`; 22+ works)
- npm 11
- Docker + Docker Compose (optional, for containerized dev/prod)

## Repo structure

```
apps/
  web/                 @oxneer/web: Next.js app
packages/
  api/                 @oxneer/api: typed API client (axios)
  ui/                  @oxneer/ui: design-system primitives, Tailwind preset, global CSS
  config-eslint/       @oxneer/config-eslint: shared ESLint flat configs (next, react-library)
  config-prettier/     @oxneer/config-prettier: shared Prettier config
  config-ts/           @oxneer/config-ts: shared tsconfig presets (base, nextjs, react-library)
nginx/                 reverse-proxy config for the prod compose setup
docker-compose.yml     prod-like (nginx + standalone Next server)
docker-compose.dev.yml dev with hot reload
turbo.json             task pipeline
```

`@oxneer/api` and `@oxneer/ui` are internal packages consumed as TypeScript source: there is no build step for them, and Next compiles them with the app (`transpilePackages` in `apps/web/next.config.ts`).

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

`npm run dev:direct` runs the same dev task without the turbo binary (for machines where Windows Device Guard blocks `turbo.exe`).

> **Windows:** run `npm install` from a path with an uppercase drive letter (`C:\…`). npm writes the workspace links with the current directory's casing, and a lowercase `c:\` makes Jest load React twice.

## Scripts (repo root)

| Command                           | What it does                      |
| --------------------------------- | --------------------------------- |
| `npm run dev`                     | Start the web app in dev mode     |
| `npm run build`                   | Production build                  |
| `npm run lint`                    | ESLint in every workspace         |
| `npm run typecheck`               | `tsc --noEmit` in every workspace |
| `npm run test`                    | Jest unit tests                   |
| `npm run e2e -w @oxneer/web`      | Playwright end-to-end tests       |
| `npm run format` / `format:check` | Prettier write / check            |

Husky + lint-staged run ESLint and Prettier on staged files at commit time.

## Docker

```bash
# Dev with hot reload
docker compose -f docker-compose.dev.yml up --build

# Prod-like: Next standalone server behind Nginx
docker compose up --build
```

## Endpoints

- Health: `curl http://localhost:3000/api/health`
- Metrics (Prometheus): `curl http://localhost:3000/api/metrics`
