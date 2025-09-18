# ContextForge — Context Management System for AI Development

A unified, local-first platform for collecting, organizing, optimizing, and personalizing all context artifacts (prompts, agent definitions, IDE rules, and more) for AI-powered software development.

---

### TL;DR

ContextForge is a local-first context management app for AI development that ingests prompts, agent definitions, IDE rules, and development templates from files, GitHub repos, and websites; classifies and optimizes them using LLMs (OpenAI, Anthropic Claude / Claude Code, Gemini); converts between prompt and rule formats (.af, .prompt, .agent, .json, .yaml, .xml, .md, .mdc); and provides versioning, audit logs, and configurable automation levels. Initially single-user (auth enabled), SQLite-backed, and designed to scale to multi-user and sync later.

---

## Goals

### Business Goals

- Reduce time-to-usable AI context by 50% for personal development workflows within 3 months of usage.

- Surface and remove redundant/obsolete context items to improve effective prompt reuse by 40% in 6 months.

- Ship a minimally viable local app (v0.1) within 6 weeks and reach daily-use reliability for single-user workflows.

### User Goals

- Consolidate scattered prompts, agent definitions, and IDE rules into a searchable, single source of truth.

- Automatically classify, optimize, and convert artifacts for target LLMs while retaining manual control.

- Maintain edit history, versioning, and an audit trail for every change.

### Non-Goals

- Real-time, full multi-user collaboration and conflict resolution on initial launch.

- Automatic push/update of source GitHub repositories (import only, no write-back on v1).

- Replace existing IDE plugins — instead act as a canonical context store and exporter.

---

## User Stories

- As a solo developer, I want to import prompts and agents from multiple GitHub repos so that I have one place to search and reuse them.

- As a developer, I want the app to detect file types and classify them (prompt, agent, rule, template) so I don’t have to tag everything manually.

- As a developer, I want optimized, LLM-tailored versions of prompts for OpenAI, Claude, and Gemini so I can quickly test the best variant in different models.

- As a developer, I want configurable automation levels so the system can either auto-apply changes or require my approval.

- As a developer, I want versioning and an audit log so I can revert or review why a prompt was changed.

---

## Functional Requirements

### Import & Ingest (Priority: High)

- **Multi-source import:** File upload (single/multi), GitHub repo import (public or authenticated), and website scraping. The GitHub importer must support selecting repo, branch, and path globs.

- **File-type filter and whitelist:** Only ingest files matching configured extensions (.af, .prompt, .agent, .json, .yaml, .xml, .md, .mdc) and user-configured include/exclude globs.

- **Smart extractor:** Parse README/markdown inline codeblocks, YAML front-matter (e.g., Cursor .mdc blocks starting with ---), and embedded JSON/YAML manifests.

### Classification & Metadata (Priority: High)

- **Automatic classification:** LLM-based classifier to tag items as: prompt, agent, IDE rule, template, snippet, or other.

- **Extract metadata:** Author (if present), source (GitHub URL / file path), language, intended LLM target(s), last-updated, and custom tags.

### Optimization & Conversion (Priority: High)

- **LLM-driven optimizers:** Suggest improvements, add metadata, and convert formats between supported types (e.g., .md -> .agent, .prompt -> .af -> JSON manifest).

- **Multi-target formatting:** Generate LLM-specific variants (OpenAI, Claude/Claude Code, Gemini) and provide side-by-side diffs.

- **Duplicate detection and merge suggestions:** Flag near-duplicates, propose merges, and tag canonical entries.

### Editor & Forms (Priority: High)

- **Unified editor:** Markdown, code editing (syntax highlight for JSON/YAML/XML), and preview of .af/.agent specs.

- **Create new item forms:** Type-specific fields and validation (e.g., required prompt, temperature hints, model-target metadata).

### Automation & Workflow Controls (Priority: High)

- **Automation levels:** Auto-apply, Auto-suggest (default), Manual-only, and Custom rules per-source.

- **Workflow queue and review UI:** Pending suggestions, accepted/declined history, bulk-apply capability with dry-run preview.

### Versioning & Audit (Priority: High)

- **Per-item version history:** Diffs, timestamp, LLM/agent that made change, and user approvals.

- **Immutable audit log:** Imports, classification runs, and automation actions.

### Search, Organization & UX (Priority: Medium)

- **Full-text search, filters:** Type, tag, source, model-target, and saved search queries.

- **Collections / Workspaces:** Grouping related context (e.g., "Next.js + Supabase", "Claude Code Agents").

### Export & Integration (Priority: Medium)

- **Export items:** Chosen format or as bulk archive (zip) with structure suitable for Git import.

- **Clipboard/IDE copy actions:** Lightweight CLI for scripted exports.

- **No push to GitHub on v1:** Only import and manual exports are supported.

### Security & Local-First Behavior (Priority: High)

- **Local-first storage:** SQLite with optional encrypted workspace. User auth enabled (single user initially).

- **Configurable LLM API keys:** Per-model, stored encrypted locally.

### Admin & Settings (Priority: Medium)

- **Configure model endpoints, default format preferences, automation level defaults, include/exclude globs, and naming conventions (camelCase vs snake_case).**

---

## User Experience

### Entry Point & First-Time User Experience

- **Installation:** Local desktop app (Electron) or local server with browser UI. On first run, user creates a single account and configures API keys for OpenAI / Anthropic / Gemini.

- **Guided import wizard:** User selects sources to scan (file system paths, GitHub repos, website URL), suggests safe globs, and runs a dry import to preview items found.

### Core Experience

1. **Ingest:** Select import source (file/GitHub/URL). System previews candidate files and auto-classifies.

2. **Review & Tag:** Items flagged for review appear in queue. LLM suggests type, optimization, and target-model variants.

3. **Edit or Accept:** Open unified editor to make changes, accept suggested optimizations, or mark for later.

4. **Organize:** Add to collections, set naming conventions, and save canonical copies.

5. **Export/Use:** Export single item or bundle for IDE import; copy to clipboard or invoke CLI to drop into project.

### Advanced Features & Edge Cases

- **Bulk-conversion:** Convert an entire repo's prompts to target-model variants with dry-run diff.

- **Large repos:** Use path globs and file-size limits; run background workers for heavy LLM processing.

- **Conflict & deduping:** Suggest canonicalization and create aliases; do not auto-delete without explicit approval.

### UI/UX Highlights

- **Automation-level control:** Clear, top-level UI.

- **Side-by-side diff viewer:** For suggested changes and format conversions.

- **Inline metadata editor and preview:** For .mdc Cursor rules (recognize front-matter structure).

- **Accessibility:** Keyboard-first workflows and responsive layout.

---

## Narrative

Eli, an AI developer, has thousands of prompts and agent snippets scattered across GitHub, notes, and code repos. When she starts a new project, she loses time hunting for the right prompt or re-creating agents. With ContextForge, Eli runs a guided import of a few repos and files. The system automatically identifies prompts, agent definitions, and Cursor rules; tags and converts them into formats tuned for OpenAI, Claude Code, and Gemini; and surfaces suggested improvements. Eli reviews the changes in a lightweight editor, accepts a curated set of prompts, and exports them into her Next.js project (named with her preferred camelCase). ContextForge keeps version history, helps remove duplicates, and continually learns Eli’s preferences. Over weeks, her projects ship faster because the most up-to-date, high-quality context is always a search away.

---

## Success Metrics

### Tracking Plan

- **Events:** import_started, import_completed, file_classified (type, confidence), suggestion_created, suggestion_accepted, suggestion_rejected, export_performed, version_reverted.

- **Properties:** source_type, file_path, model_target, automation_level, user_id, timestamp, suggestion_confidence.

---

## Technical Considerations

### Technical Needs

- **Local DB:** SQLite for primary storage with a simple schema: items, versions, sources, tags, collections, imports, audit_log, users, api_keys.

- **Background workers:** Queue for classification, optimization, and conversion jobs (e.g., using a small job queue or native worker threads).

- **LLM Integration layer:** Adapter pattern supporting OpenAI, Anthropic (Claude + Claude Code), and Gemini. Allow pluggable model connectors.

- **File parsers:** Markdown codeblock & front-matter extractor, JSON/YAML/XML parsers, and Cursor .mdc front-matter handler.

### Integration Points

- **GitHub API:** Import-only, with path selection and repo scanning. Implement rate-limit handling and caching of repo trees.

- **Local FS watcher:** Optional folder watch to auto-import files from configured local paths.

### Data Storage & Privacy

- **Encrypted keys:** Store API keys encrypted at rest; provide optional full-workspace encryption. All user data local by default.

- **Ephemeral LLM cache:** Configurable retention for LLM responses.

### Scalability & Performance

- **Single-user local scale:** SQLite is sufficient. Use workerized LLM calls to avoid blocking UI and throttle to user-configured concurrency.

- **Incremental imports:** Support resume and partial import jobs.

### Potential Challenges

- **Classifier/optimizer hallucination:** Require confidence thresholds and human review by default.

- **Parsing varied formats:** Correctly extract embedded prompts/agents from diverse repo structures.

- **API cost/rate-limiting:** Budget monitoring and model-fallback strategies for heavy optimization jobs.

---

## Milestones & Sequencing

### Project Estimate

- **Extra-small to Small:** Complete MVP in 4–8 weeks with a 1–2 person effort.

### Team Size & Composition

- **Small Team:** 1 product/engineer (you), 1 designer (part-time), optionally 1 contractor for LLM integration.

### Suggested Phases

1. **Phase 0 — Kickoff & Core Design (1 week)**

- Data model, import flows, automation-level spec, example files imported.

2. **Phase 1 — Local Import + UI (2–3 weeks)**

- Local app shell, SQLite schema, GitHub import with globs, file upload, basic viewer/editor, simple classification stub.

3. **Phase 2 — LLM Integration & Optimization (2–3 weeks)**

- Integrations for OpenAI, Anthropic, Gemini; LLM-based classification & optimizer; automation queue and review UI.

4. **Phase 3 — Conversion, Versioning & Exports (1–2 weeks)**

- Format converters, per-item version history, export bundles, naming-convention enforcement.

5. **Phase 4 — Polish & Reliability (1–2 weeks)**

- Audit trails, settings UI, saved queries, local FS watcher, and basic CLI.

---

## Appendix: Data Model Sketch & Acceptance Criteria

### Data Model (High Level)

### Acceptance Criteria (v0.1)

- Import wizard can import a public GitHub repo and surface files matching configured globs.

- System auto-classifies at least 80% of imported items correctly (heuristic + LLM tune).

- User can accept/decline LLM suggestions; accepted changes create a new version with an audit entry.

- Items can be exported in chosen format and bundled for manual Git import.

---

### Example Parsing Rule for .mdc Frontmatter

---

## description: "Rule for enforcing camelCase in file names" globs: \["src/**/\*.ts", "src/**/\*.tsx"\] alwaysApply: true

---

### Example Automation Settings Semantics

---

### UI Wireframe Notes

- Dashboard with tabs for Prompts, Agents, Rules, Hooks, and All Items.

- Import wizard with source selection, file filters, and preview.

- Editor pane with syntax highlighting, live preview, and metadata sidebar.

- Approval modal for reviewing AI-suggested changes.

- Search bar with filters for type, tags, and source.

- Settings panel for preferences and automation level.

---

**Next Steps:**

- Review and refine data models and UI wireframes.

- Build initial importers and editor MVP.

- Integrate LLM APIs for classification and optimization.

- Gather feedback and iterate on onboarding and personalization flows.
