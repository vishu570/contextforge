# Local Development Guide

This guide walks through setting up ContextForge for day-to-day development.

## Prerequisites
- Node.js 18+ with `corepack` enabled (`corepack enable`).
- pnpm 10 (activated via `corepack prepare pnpm@10.17.0 --activate`).
- SQLite (bundled) or PostgreSQL if you plan to connect to external infra.

## Install Dependencies
```bash
pnpm install
```
All workspaces resolve through pnpm; avoid `npm install` or `yarn` to keep lockfiles stable.

## Environment Variables
```bash
cp .env.example .env
```
Populate required secrets (`NEXTAUTH_SECRET`, `JWT_SECRET`) and optional provider keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`). Local-only values can stay in `.env`; production overrides belong in your deployment pipeline.

## Database Setup
SQLite is the default for local runs.
```bash
pnpm prisma generate
pnpm prisma db push
```
Use `pnpm prisma db push --force-reset` when you need a clean slate. Launch Prisma Studio with `pnpm prisma studio` for quick inspection.

## Running the App
```bash
pnpm dev          # App router with Turbopack on http://localhost:3001
pnpm server:dev   # Web app + background queue worker
```
For production parity, build and serve the bundle:
```bash
pnpm build
pnpm start        # Serves on port 3000 by default
```

## Linting & Type Safety
```bash
pnpm lint         # ESLint via next lint
pnpm tsc          # Type-only compilation, no emit
```
Run these before committing to catch regressions early.

## Working with the CLI Workspace
The CLI lives under `cli/` and shares the monorepo toolchain.
```bash
pnpm --filter @contextforge/cli install
pnpm --filter @contextforge/cli dev   # ts-node entry point
pnpm --filter @contextforge/cli build
```
Compiled binaries land in `cli/dist/`. Publishing requires the `publish-cli` script, but keep it local unless you are coordinating a release.

## Useful Scripts & Utilities
- `pnpm swarm:*` — manage the agent swarm lifecycle (see dedicated guide).
- `pnpm queue:*` — inspect and clear Bull queue jobs.
- `pnpm exec prisma migrate diff` — compare schema changes without applying them.

## Docker Notes
A compose stack lives in `docker/`. To spin up the full environment (PostgreSQL, Redis, monitoring), run:
```bash
docker compose up --build
```
Sync `.env.docker` with runtime credentials beforehand. The stack exposes the app on port 3000.

Stay aligned with the [Repository Guidelines](../../AGENTS.md) when creating branches, writing commits, or opening pull requests.
