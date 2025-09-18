# Testing Playbook

ContextForge currently ships two primary automated test layers: Jest for unit/integration scenarios and Playwright for browser flows. Follow the steps below before submitting changes.

## Prerequisites
1. Install dependencies with `pnpm install`.
2. Ensure your `.env` mirrors `.env.test` defaults or create one as needed.
3. Prepare the database when tests rely on Prisma models:
   ```bash
   pnpm prisma db push --force-reset
   pnpm prisma generate
   ```
   This resets the SQLite file used for local runs. Point the `DATABASE_URL` env var to a dedicated test database if you need isolation.

## Jest (Unit & Integration)
- Test sources currently live under `legacy-tests/` until suites migrate into feature folders.
- Run all suites:
  ```bash
  pnpm exec jest
  ```
- Focus on a specific file or pattern:
  ```bash
  pnpm exec jest legacy-tests/unit/swarm/orchestrator.test.ts
  pnpm exec jest --testPathPattern=queue
  pnpm exec jest --watch
  ```
- Coverage thresholds are enforced globally (lines ≥ 80%, branches ≥ 75%, functions ≥ 80%). Reports write to `coverage/` with `lcov`, `html`, and console summaries.

## Playwright (End-to-End)
Playwright specs live under `test/e2e/` (create the folder when adding new coverage). The config auto-starts the dev server via `pnpm dev` unless one is already running.
```bash
pnpm exec playwright test           # Headless run
pnpm exec playwright test --ui      # Visual runner for debugging
pnpm exec playwright show-trace     # Inspect saved traces
```
Artifacts (screenshots, videos, traces) are stored in `test-results/`. When debugging auth flows, seed baseline users through the app UI or a dedicated script.

## Recommended Workflow
1. Run `pnpm lint` and `pnpm tsc` to catch syntax and typing issues.
2. Execute focused Jest suites tied to your changes.
3. Finish with a full Jest run plus relevant Playwright specs (or the entire suite if risk is high).
4. Capture flaky results in an issue; note them in your PR until resolved.

Keeping tests healthy is part of the review bar—update or add coverage alongside new features or behavioral changes.
