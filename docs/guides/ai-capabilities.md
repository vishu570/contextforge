# AI Capabilities Guide

ContextForge bundles several AI-facing tools that help authors design, analyze, and optimize prompts and agents. This guide points to the main components and how to extend them.

## Feature Highlights
- **Model Selection** with presets and cost estimates (`components/features/llm/model-selector.tsx`).
- **Function Attachment System** for reusable tooling (`components/features/functions/function-attachment-system.tsx`).
- **Prompt Testing Playground** with side-by-side comparisons (`components/features/playground/prompt-testing-playground.tsx`).
- **Advanced Prompt Editor** with Monaco integration and versioning (`components/features/editor/advanced-prompt-editor.tsx`).
- **Optimization Pipelines** that queue, track, and report job status (`components/prompt-optimization.tsx`, `lib/pipeline/`).

## Model & Credential Management
- `components/model-settings.tsx` exposes provider selection, presets, and default parameters.
- `components/api-key-management.tsx` and `components/api-key-dialog.tsx` handle secure key input. Keys are stored through the credential manager defined in `lib/auth.ts`.

When introducing a new provider, add client code under `lib/llm/` or `lib/ai/` and register it in the model settings component. Persist provider metadata in Prisma as needed (see `prisma/schema.prisma` for existing `ProviderAccount` fields).

## Prompt Authoring Workflows
- `components/features/editor/advanced-prompt-editor.tsx` offers Monaco-based editing, variable templates, and version comparisons.
- `components/prompt-template-blocks.tsx` surfaces reusable snippets.
- `components/prompt-versioning.tsx` tracks revisions and change notes.

Keep schema updates for prompt metadata in `prisma/schema.prisma`; mirror changes inside the Zod schemas embedded in these components.

## Optimization & Analysis
- `components/prompt-optimization.tsx` and `lib/pipeline/` coordinate optimization jobs.
- `components/ai-performance-analytics.tsx`, `components/prompt-analytics.tsx`, and `components/content-intelligence-analytics.tsx` visualize token counts, latency, and quality metrics collected through helpers in `lib/pipeline/` and `lib/models/`.
- Queue workers under `legacy-tests/unit/queue/` illustrate how the optimization worker is expected to behave; reference them when adding new jobs.

## Testing AI Integrations
- Unit tests: Add targeted coverage in `legacy-tests/unit/pipeline/` for pipelines and `legacy-tests/unit/swarm/` for orchestration.
- Integration tests: Exercise full job lifecycles in `legacy-tests/integration/api/` and expand as workflows mature.
- Playwright: Capture UI regressions for authoring and analytics flows under `test/e2e/`.

## Extending the Feature Set
1. Model integration lives in `lib/llm/` or provider-specific modules under `lib/ai/`.
2. Background processing should enqueue work via `lib/queue/`, with scripts in `scripts/` orchestrating long-running tasks.
3. Persist additional metrics in Prisma models, then expose them through dedicated React components.

Document new behaviors in a follow-up PR so this guide remains accurate.
