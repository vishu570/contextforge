## ContextForge App

A Next.js application for AI-powered context management.

### Requirements
- Node.js 18+ (use `corepack` for package manager)
- pnpm (managed via corepack)
- SQLite (bundled) or Postgres/Redis when using docker-compose

### Install
```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install
```

### Development
```bash
pnpm dev
# or run app and local server concurrently
pnpm server:dev
```

### Build and Start
```bash
pnpm build
pnpm start
```

### Prisma
```bash
# Generate client
pnpm prisma generate

# Apply schema to dev DB (SQLite by default)
pnpm prisma db push

# Reset dev DB (destructive)
pnpm prisma db push --force-reset

# Inspect DB
pnpm prisma studio
```

### Testing
```bash
pnpm test
```

### Linting and Type Check
```bash
pnpm lint
pnpm tsc --noEmit
```

### Docker
- Build optimized production image:
```bash
docker build -t contextforge-app .
```
- Run:
```bash
docker run -p 3000:3000 --name contextforge contextforge-app
```

### Docker Compose (dev stack)
```bash
docker compose -f docker-compose.dev.yml up --build
```

### Monorepo
This repo uses a pnpm workspace with:
- Root app (`.`)
- CLI package (`cli`)

Workspace file: `pnpm-workspace.yaml`.

### Scripts
- `dev`: Next.js dev
- `build`: Next.js build
- `start`: Next.js start
- `server:start`: start local server scripts
- `server:dev`: run `dev` and `server:start` concurrently

### Notes
- Package manager is pinned via `packageManager` in `package.json` and handled by corepack.
- Prefer `pnpm` commands over `npm`/`yarn`.
