# System Architecture Overview

ContextForge is a Next.js 15 (App Router) application with a supporting agent and queue system. This document summarizes the major modules and how they interact.

## High-Level Components
- **App Router (`app/`)** — Server and client routes, API handlers, and middleware.
- **UI Components (`components/`)** — Reusable building blocks plus feature-specific dashboards, editors, and analytics panels.
- **Domain Logic (`lib/`)** — Authentication, imports, LLM adapters, pipelines, queues, and data helpers.
- **Data Layer (`prisma/`)** — Prisma schema for SQLite/PostgreSQL along with generated client code.
- **Scripts (`scripts/`)** — Operational tooling for swarms, queues, and infrastructure tasks.
- **CLI Workspace (`cli/`)** — Experimental command-line entry point built with TypeScript.
- **Legacy Tests (`legacy-tests/`)** — Source of record for current automated coverage while suites migrate into feature folders.

## Request Flow
1. UI renders via components under `app/` and `components/`.
2. API requests hit handlers in `app/api/*/route.ts`.
3. Handlers orchestrate work using services under `lib/` (e.g., `lib/import`, `lib/llm`, `lib/workflow`).
4. Long-running jobs enqueue work via `lib/queue/`, processed by scripts and workers launched through `pnpm server:dev` or dedicated swarm scripts.
5. Persistent data is stored through Prisma models defined in `prisma/schema.prisma`.

## Background & Automation
- Queue workers live in `lib/queue/` and `lib/swarm/` with entry points under `scripts/`.
- Swarm orchestration uses `swarm-config.json` to describe specialized agents. See the Swarm guide for runtime commands.
- Redis provides queue backing (configure via `.env`). When absent, background jobs should be stubbed or disabled.

## Frontend Composition
- Shared UI primitives: `components/ui/` (shadcn/ui foundation).
- Feature modules: `components/*` and `components/features/**` for analytics, prompt tooling, and management workflows.
- Styling: Tailwind CSS (configured in `tailwind.config.js`) and component-level classes.

## Supporting Assets
- **`memory/`** — Agent constitution and operational checklists.
- **`docs/`** — This documentation set.
- **`templates/`** — Seed content and scaffolding helpers.
- **`public/`** — Static assets.

Use this overview when orienting new modules or reviewing large-scale refactors. Align new directories with the existing structure and update this document when architecture decisions change.
