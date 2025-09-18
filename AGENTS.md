# Repository Guidelines

## Project Structure & Module Organization
The Next.js App Router lives under `app/`, which also contains route handlers. Shared UI sits in `components/` (kebab-case files, PascalCase exports) and domain helpers in `lib/` and `hooks/`. Background workers and deployment utilities live in `scripts/`, database schema in `prisma/`, and the CLI prototype in `cli/`. Historical and regression suites remain in `legacy-tests/`, while deeper design notes live in `docs/` and `specs/`.

## Build, Test, and Development Commands
- `pnpm install` – install workspace dependencies via corepack.
- `pnpm dev` – run the app on port 3001 using Turbopack.
- `pnpm server:dev` – launch the UI plus background queue worker.
- `pnpm build` / `pnpm start` – create and serve the production bundle.
- `pnpm lint` – run ESLint (`next lint`) across the workspace.
- `pnpm tsc` – type-check against `tsconfig.typecheck.json`.
- `pnpm exec jest` – execute unit and integration suites in `legacy-tests/**`.
- `pnpm exec playwright test` – run browser flows expected under `test/e2e`.

## Coding Style & Naming Conventions
Stick to TypeScript with two-space indentation and run `pnpm lint --fix` before committing. File names stay lowercase with hyphens, React exports use `PascalCase`, and functions stay `camelCase`. Keep styling in Tailwind classes or local modules beside the component, centralize reusable data access in `lib/`, and rely on the `@/` alias for absolute imports.

## Testing Guidelines
Name Jest specs `*.test.ts(x)` so they are picked up from `legacy-tests/` or any `test/**` directory. The config enforces ≥80% line/function coverage and ≥75% branch coverage, so extend suites whenever you modify critical flows. Place Playwright scenarios in `test/e2e/`; artifacts land in `test-results/`, and the bundled web server will boot via `pnpm dev` when needed. Use `pnpm prisma db push --force-reset` to reset the SQLite database before integration or e2e runs.

## Commit & Pull Request Guidelines
Follow the conventional commit style already in history (`feat:`, `fix:`, `chore:`) with concise lowercase summaries. Reference related issues, document behavioral changes, and flag migrations or env updates. Before opening a PR, run `pnpm lint`, `pnpm tsc`, and the relevant tests, add screenshots for UI work, and capture rollout notes so reviewers can verify quickly.

## Swarm & Agent Operations
Use `pnpm swarm:start`, `pnpm swarm:status`, and `pnpm swarm:stop` to control the swarm scripts in `scripts/swarm-*.ts`. Inspect and clear background jobs with `pnpm queue:status` and `pnpm queue:clear` before retrying stuck tasks.
