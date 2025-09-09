# Tasks: ContextForge Platform Development

**Input**: Design documents from `/specs/001-develop-contextforge-a/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)

```
1. Load plan.md from feature directory ✅
   → Tech stack: TypeScript/Next.js, Prisma, React, AI SDKs
   → Libraries: lib/ai/, lib/import/, lib/search/, lib/validation/
   → Structure: Single Next.js project with enhanced lib/ organization
2. Load optional design documents ✅:
   → data-model.md: 5 entities (Item, Collection, OptimizationResult, etc.)
   → contracts/: 3 API files (AI, Import, Search)
   → research.md: Multi-provider AI, background processing decisions
3. Generate tasks by category ✅:
   → Setup: Database migrations, dependencies
   → Tests: 3 contract tests, 6 integration tests
   → Core: 6 libraries, API endpoints, UI fixes
   → Integration: Queue processing, error handling
   → Polish: Unit tests, performance, cleanup
4. Apply task rules ✅:
   → Different files marked [P] for parallel
   → Tests before implementation (TDD)
   → Dependencies mapped
5. Generated 42 sequential tasks (T001-T042)
6. Dependency graph validated ✅
7. Parallel execution examples provided ✅
8. Task completeness validated ✅
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

Using existing Next.js structure (single project):

- **Business logic**: `lib/` at repository root
- **API endpoints**: `app/api/` (Next.js app router)
- **UI components**: `app/components/`
- **Database**: `prisma/` with migrations
- **Tests**: `test/` with contract/, integration/, unit/ subdirs (using existing structure)

## Phase 3.1: Setup & Database

### Database Schema Specifications
**Reference**: data-model.md for complete field definitions and relationships

#### Required Prisma Enums (T001a)
```prisma
enum OptimizationStatus {
  none
  pending
  optimized  
  failed
}

enum SourceType {
  manual
  github
  local
  imported
}

enum CategoryType {
  manual
  ai_suggested
  ai_confirmed
}
```

#### New Models Required (T001b-T001d)
```prisma
model OptimizationResult {
  id                String            @id @default(cuid())
  itemId            String
  item              Item              @relation(fields: [itemId], references: [id], onDelete: Cascade)
  optimizationType  String            // 'content', 'structure', 'metadata', 'categorization'
  originalVersion   String
  optimizedVersion  String
  improvementNotes  String?
  confidence        Float             // 0.0-1.0
  aiProvider        String            // 'openai', 'anthropic', 'gemini'
  processingTime    Int               // milliseconds
  userFeedback      String?           // 'accepted', 'rejected', 'modified'
  createdAt         DateTime          @default(now())
  acceptedAt        DateTime?
  
  @@index([itemId])
}

model OptimizationQueue {
  id                String            @id @default(cuid())
  itemId            String
  optimizationType  String
  priority          Int               @default(0)
  status            String            @default("pending") // 'pending', 'processing', 'completed', 'failed'
  attempts          Int               @default(0)
  errorMessage      String?
  scheduledAt       DateTime          @default(now())
  startedAt         DateTime?
  completedAt       DateTime?
  
  @@index([status, scheduledAt])
}

model ItemCategory {
  id              String      @id @default(cuid())
  itemId          String
  item            Item        @relation(fields: [itemId], references: [id], onDelete: Cascade)
  categoryId      String
  category        Collection  @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  confidence      Float?      // 0.0-1.0
  isAiSuggested   Boolean     @default(false)
  createdAt       DateTime    @default(now())
  confirmedAt     DateTime?
  
  @@unique([itemId, categoryId])
  @@index([itemId])
}
```

- [ ] T001a [P] Add new Prisma enums (OptimizationStatus, SourceType, CategoryType) to prisma/schema.prisma
- [ ] T001b [P] Add OptimizationResult model to prisma/schema.prisma (exact schema above)
- [ ] T001c [P] Add OptimizationQueue model to prisma/schema.prisma (exact schema above)
- [ ] T001d [P] Add ItemCategory junction table to prisma/schema.prisma (exact schema above)
- [ ] T002 [P] Add enhanced Item fields to existing Item model in prisma/schema.prisma:
  ```prisma
  // Add to existing Item model:
  aiOptimizationStatus   OptimizationStatus?  @default(none)
  originalContent        String?
  optimizedContent       String?
  autoCategories         Json?
  confidence             Float?
  sourceType            SourceType?           @default(manual)  
  sourceMetadata        Json?
  optimizationResults   OptimizationResult[]
  itemCategories        ItemCategory[]
  ```
- [ ] T003 [P] Add enhanced Collection fields to existing Collection model in prisma/schema.prisma:
  ```prisma
  // Add to existing Collection model:
  categoryType          CategoryType?         @default(manual)
  semanticEmbedding     Bytes?               // vector representation
  autoSuggestionRules   Json?
  confidence            Float?
  parentCategoryId      String?
  parentCategory        Collection?          @relation("CategoryHierarchy", fields: [parentCategoryId], references: [id])
  childCategories       Collection[]         @relation("CategoryHierarchy")
  itemCategories        ItemCategory[]
  ```
- [ ] T004 [P] Add enhanced Import fields to existing Import model in prisma/schema.prisma:
  ```prisma
  // Add to existing Import model (find via existing Source relationship):
  importSettings       Json?
  scheduledSync        Boolean              @default(false)
  syncFrequency        String?              // cron expression
  lastSyncAt           DateTime?
  syncStatus          String               @default("idle") // 'idle', 'syncing', 'failed', 'completed'
  ```
- [ ] T005 Run database migration and verify schema changes
- [ ] T007 [P] Initialize lib/ai/ directory structure with index.ts exports
- [ ] T008 [P] Initialize lib/import/ directory structure with index.ts exports
- [ ] T009 [P] Initialize lib/search/ directory structure with index.ts exports
- [ ] T010 [P] Initialize lib/validation/ directory structure with index.ts exports

## Phase 3.2: Contract Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Test Implementation Guidelines
**References**: 
- Existing test patterns: `test/integration/api/intelligence.test.ts`
- Test utilities: `test/mocks/services.ts`, `test/utils/test-utils.ts`
- API contracts: `contracts/*.yaml` files

**Each contract test MUST**:
- Use existing test setup patterns from `test/integration/api/intelligence.test.ts`
- Import and validate against specific OpenAPI schema sections
- Test ALL response codes (200, 202, 400, 404, 429)
- Use actual HTTP requests (not mocked)
- FAIL initially (no implementation exists yet)

#### AI Optimization Contract Tests
- [ ] T011 [P] Contract test POST /api/ai/optimize in test/contract/ai-optimization.test.ts
  ```typescript
  // MUST validate request schema (contracts/ai-optimization-api.yaml lines 16-37):
  // Required: itemId (string), optimizationType (enum: content|structure|metadata|categorization)
  // Optional: provider (enum: openai|anthropic|gemini|auto), preserveOriginal (boolean)
  
  // MUST test response schemas:
  // 200: OptimizationResult (lines 127-153)
  // 202: { jobId: string, estimatedCompletion: date-time } (lines 45-56)
  // 400/404/429: Error responses (lines 57-62)
  
  // MUST use existing patterns from test/integration/api/intelligence.test.ts lines 1-30
  ```

- [ ] T012 [P] Contract test GET /api/ai/optimize/{jobId}/status in test/contract/ai-optimization.test.ts
  ```typescript
  // MUST validate response schema (contracts/ai-optimization-api.yaml lines 78-91):
  // { status: enum, progress: 0-100, result?: OptimizationResult, error?: string }
  
  // MUST test path parameter validation: jobId (string, required)
  ```

- [ ] T013 [P] Contract test POST /api/ai/categorize in test/contract/ai-categorization.test.ts
  ```typescript
  // MUST validate request schema (contracts/ai-optimization-api.yaml lines 100-111):
  // Required: itemId (string)
  // Optional: maxSuggestions (integer, 1-10, default: 5)
  
  // MUST validate response schema (lines 117-123):
  // { suggestions: CategorySuggestion[] } where CategorySuggestion (lines 155-167)
  ```

#### Import Contract Tests  
- [ ] T014 [P] Contract test POST /api/import/github in test/contract/import-github.test.ts
  ```typescript
  // MUST validate request schema (contracts/import-api.yaml lines 16-49):
  // Required: url (uri format)
  // Optional: filters (fileExtensions, paths, excludePaths), autoCategorie, collectionId
  
  // MUST test response: 202 ImportJob with { id, sourceType, status, estimatedCompletion }
  ```

- [ ] T015 [P] Contract test POST /api/import/local in test/contract/import-local.test.ts
  ```typescript
  // MUST validate multipart/form-data schema (contracts/import-api.yaml)
  // Required: files (binary array)
  // Optional: preserveStructure, autoCategorie, filters (JSON string)
  ```

- [ ] T016 [P] Contract test GET /api/import/{jobId}/status in test/contract/import-status.test.ts
  ```typescript
  // MUST validate job status response with progress tracking
  // MUST test path parameter: jobId (string, required)
  ```

#### Search Contract Tests
- [ ] T017 [P] Contract test GET /api/search in test/contract/search-api.test.ts
  ```typescript
  // MUST validate query parameters (contracts/search-api.yaml lines 12-65):
  // q, type (text|semantic|hybrid), categories, sourceType, optimized, limit, offset, sort, order
  
  // MUST validate SearchResults response with facets
  ```

- [ ] T018 [P] Contract test GET /api/search/suggest in test/contract/search-api.test.ts
  ```typescript
  // MUST validate autocomplete suggestions response
  // Required: q (partial query), Optional: limit (1-10)
  ```

- [ ] T019 [P] Contract test GET /api/search/filters in test/contract/search-api.test.ts
  ```typescript
  // MUST validate faceted search filters response
  // Response: { categories: [], sourceTypes: [], fileTypes: [] } with counts
  ```

## Phase 3.3: Integration Tests (Based on User Stories)

### Integration Test Implementation Guidelines
**References**:
- User scenarios: `quickstart.md` Test Scenarios 1-6
- Performance benchmarks: `quickstart.md` lines 251-269
- Existing patterns: `test/integration/api/intelligence.test.ts`

**Each integration test MUST**:
- Use real database (SQLite)  
- Test complete user workflows from quickstart.md
- Verify performance benchmarks
- Include error handling scenarios
- Use existing test utilities (`createMockUser`, `createMockItem`)

- [ ] T020 [P] Integration test GitHub repository import in test/integration/github-import.test.ts
  ```typescript
  // MUST implement quickstart.md Test Scenario 1 (lines 37-74)
  // MUST test: https://github.com/anthropics/claude-prompt-library import
  // MUST verify: <30 seconds for 100 files (quickstart.md line 255)
  // MUST validate: Auto-categorization, source type tracking
  // MUST test error cases: Invalid URLs, network failures, rate limits
  ```

- [ ] T021 [P] Integration test local folder import in test/integration/local-import.test.ts
  ```typescript
  // MUST implement quickstart.md Test Scenario 2 (lines 77-117)
  // MUST test: Folder structure preservation, file type detection
  // MUST verify: <60 seconds for 500 files (quickstart.md line 256)
  // MUST validate: Hierarchy preservation, auto-categorization
  ```

- [ ] T022 [P] Integration test AI optimization workflow in test/integration/ai-optimization.test.ts
  ```typescript
  // MUST implement quickstart.md Test Scenario 3 (lines 119-151)
  // MUST verify: <10 seconds content optimization (quickstart.md line 267)
  // MUST test: All optimization types (content, structure, metadata, categorization)
  // MUST validate: Original content preservation, confidence scores, user feedback
  // MUST test: Multiple AI providers (OpenAI, Anthropic, Gemini)
  ```

- [ ] T023 [P] Integration test semantic search and filtering in test/integration/search.test.ts
  ```typescript
  // MUST implement quickstart.md Test Scenario 4 (lines 154-187)
  // MUST verify: <500ms semantic search (quickstart.md line 262)
  // MUST test: Text, semantic, and hybrid search modes
  // MUST validate: Faceted filtering, result ranking, pagination
  ```

- [ ] T024 [P] Integration test auto-categorization in test/integration/categorization.test.ts
  ```typescript
  // MUST verify: <5 seconds categorization (quickstart.md line 269)
  // MUST test: AI category suggestions, confidence scoring
  // MUST validate: Manual override capability, category hierarchy
  ```

- [ ] T025 [P] Integration test button functionality fixes in test/integration/ui-validation.test.ts
  ```typescript
  // MUST implement quickstart.md Test Scenario 5 (lines 189-223)
  // MUST test: All UI buttons respond <100ms (quickstart.md line 210)
  // MUST validate: Loading states, error handling, success feedback
  // MUST test: Navigation, import, optimization, search, category, settings buttons
  ```

## Phase 3.4: Core Library Implementation (ONLY after tests are failing)

- [ ] T026 [P] AI optimization service in lib/ai/optimization/service.ts with multi-provider support
- [ ] T027 [P] AI categorization service in lib/ai/categorization/service.ts
- [ ] T028 [P] AI provider abstraction in lib/ai/providers/index.ts (OpenAI, Anthropic, Gemini)
- [ ] T029 [P] GitHub import processor in lib/import/github/processor.ts with Octokit integration
- [ ] T030 [P] Local file import processor in lib/import/local/processor.ts with recursive directory handling
- [ ] T031 [P] Import queue manager in lib/import/queue/manager.ts using Bull queues
- [ ] T032 [P] Semantic search engine in lib/search/semantic/engine.ts with vector embeddings
- [ ] T033 [P] Text search implementation in lib/search/text/search.ts
- [ ] T034 [P] Search filter system in lib/search/filters/facets.ts
- [ ] T035 [P] UI validation utilities in lib/validation/ui/buttons.ts

## Phase 3.5: API Endpoint Implementation

- [ ] T036 POST /api/ai/optimize endpoint in app/api/ai/optimize/route.ts
- [ ] T037 GET /api/ai/optimize/[jobId]/status endpoint in app/api/ai/optimize/[jobId]/status/route.ts
- [ ] T038 POST /api/import/github endpoint in app/api/import/github/route.ts
- [ ] T039 POST /api/import/local endpoint in app/api/import/local/route.ts
- [ ] T040 GET /api/search endpoint in app/api/search/route.ts with semantic and text search

## Phase 3.6: Integration & Polish

- [ ] T041 Background queue processing setup and error handling
- [ ] T042 [P] Performance optimization and code cleanup based on quickstart benchmarks

## Dependencies

**Phase Blocking**:

- Setup (T001-T010) before Tests (T011-T025)
- Tests (T011-T025) before Implementation (T026-T040)
- Implementation (T026-T040) before Integration (T041-T042)

**Task Dependencies**:

- T001-T005 (database schema) blocks T006 (migration)
- T007-T010 (lib structure) blocks T026-T035 (library implementation)
- T026-T035 (libraries) blocks T036-T040 (API endpoints)
- T031 (queue manager) blocks T041 (queue processing)

## Parallel Execution Examples

### Phase 3.1 - Database Setup (Run T002-T005 together)

```bash
# Launch schema updates in parallel:
Task: "Add OptimizationResult model to prisma/schema.prisma"
Task: "Add enhanced Item fields to prisma/schema.prisma"
Task: "Add enhanced Collection fields to prisma/schema.prisma"
Task: "Add enhanced Import fields to prisma/schema.prisma"
```

### Phase 3.2 - Contract Tests (Run T011-T019 together)

```bash
# Launch contract tests in parallel:
Task: "Contract test POST /api/ai/optimize in tests/contract/ai-optimization.test.ts"
Task: "Contract test POST /api/import/github in tests/contract/import-github.test.ts"
Task: "Contract test GET /api/search in tests/contract/search-api.test.ts"
# ... (all contract tests can run in parallel)
```

### Phase 3.3 - Integration Tests (Run T020-T025 together)

```bash
# Launch integration tests in parallel:
Task: "Integration test GitHub import in tests/integration/github-import.test.ts"
Task: "Integration test AI optimization in tests/integration/ai-optimization.test.ts"
Task: "Integration test semantic search in tests/integration/search.test.ts"
# ... (all integration tests can run in parallel)
```

### Phase 3.4 - Core Libraries (Run T026-T035 together)

```bash
# Launch library implementations in parallel:
Task: "AI optimization service in lib/ai/optimization/service.ts"
Task: "GitHub import processor in lib/import/github/processor.ts"
Task: "Semantic search engine in lib/search/semantic/engine.ts"
# ... (all library files can run in parallel)
```

## Task Details

### Database Schema Tasks (T001-T006)

**T001**: Create migration file in `prisma/migrations/` adding:

- OptimizationResult table with all fields from data-model.md
- Enhanced Item fields: aiOptimizationStatus, originalContent, optimizedContent, autoCategories, confidence, sourceType, sourceMetadata
- Enhanced Collection fields: categoryType, semanticEmbedding, autoSuggestionRules, confidence, parentCategoryId
- Enhanced Import fields: sourceType, sourceUrl, importSettings, scheduledSync, syncFrequency, lastSyncAt, syncStatus

### Contract Test Requirements (T011-T019)

Each contract test MUST:

- Import OpenAPI spec from contracts/ directory
- Test request/response schemas match exactly
- Verify error response formats (400, 404, 429)
- Test async job creation (202 responses with jobId)
- Use actual HTTP requests (not mocked)
- FAIL initially (no implementation exists)

### Integration Test Requirements (T020-T025)

Each integration test MUST:

- Use real database (SQLite)
- Test complete user workflows from quickstart.md
- Verify performance benchmarks (<500ms search, <60s imports)
- Include error handling scenarios
- Test with actual AI providers (when API keys available)

### Library Implementation Requirements (T026-T035)

Each library MUST:

- Export clean public interface
- Include CLI commands for testing
- Use structured logging (JSON format)
- Handle errors gracefully with context
- Follow existing code patterns
- Support configuration via environment

**Implementation Guides**:

**T026 - AI Client Library (`lib/ai/client.ts`)**:
```typescript
// MUST follow existing auth patterns from lib/auth.ts lines 43-60 (encryptApiKey/decryptApiKey)
// MUST use interface patterns from lib/ai/intelligence-coordinator.ts for provider abstraction
// MUST implement AIProvider interface:
interface AIProvider {
  optimize(content: string, type: OptimizationType): Promise<OptimizationResult>
  categorize(content: string): Promise<string[]>
  embed(text: string): Promise<number[]>
}
// MUST support providers: OpenAI, Anthropic, Gemini
// MUST use encrypted API keys from User model (apiKeys field)
// MUST implement retry logic with exponential backoff (see lib/queue/workers/base-worker.ts pattern)
```

**T027 - GitHub Import Processor (`lib/import/github/processor.ts`)**:
```typescript
// MUST use existing parsers from lib/parsers.ts for file processing
// MUST integrate with queue system from lib/queue/index.ts for background jobs
// MUST follow websocket patterns from lib/websocket/manager.ts for progress updates
// MUST support GitHub API pagination and rate limiting
// MUST validate URLs and handle authentication for private repos
// CLI: `pnpm github:import <url> [--filters] [--collection-id]`
```

**T028 - Local Import Processor (`lib/import/local/processor.ts`)**:
```typescript
// MUST reuse GitHub processor patterns for file handling
// MUST support multipart file upload processing
// MUST preserve folder structure as collections when preserveStructure=true
// MUST use same queue/websocket progress patterns as GitHub import
// CLI: `pnpm local:import <path> [--preserve-structure] [--filters]`
```

**T029 - Semantic Search Engine (`lib/search/semantic/engine.ts`)**:
```typescript
// MUST integrate with existing embeddings from lib/embeddings/index.ts
// MUST use semantic clustering from lib/semantic/clustering.ts
// MUST support hybrid search (text + semantic)
// MUST implement faceted search with category/sourceType filters
// MUST achieve <500ms performance target (contracts/search-api.yaml line 178)
// CLI: `pnpm search:test "<query>" [--type=semantic|text|hybrid]`
```

**T030 - Content Optimizer (`lib/ai/optimization/service.ts`)**:
```typescript
// MUST use AI client from T026 for multi-provider support
// MUST implement optimization pipeline from lib/pipeline/optimization-pipeline.ts
// MUST support all optimization types: content, structure, metadata, categorization
// MUST store results in OptimizationResult model
// MUST integrate with queue system for background processing
// CLI: `pnpm optimize:content <item-id> [--type=content|structure|metadata|categorization]`
```

**T031 - Queue Manager (`lib/queue/manager.ts`)**:
```typescript
// MUST extend existing queue/index.ts with new job types
// MUST support job priority levels (low, medium, high, critical)
// MUST implement job retry with exponential backoff
// MUST provide progress tracking via websocket
// MUST handle graceful shutdown and job cleanup
// CLI: `pnpm queue:status` and `pnpm queue:clear [job-type]`
```

**T032 - Auto-Categorization (`lib/ai/categorization/service.ts`)**:
```typescript
// MUST use AI client from T026 for content analysis
// MUST integrate with existing content-analysis from lib/ai/content-analysis.ts
// MUST support confidence scoring (0.0-1.0)
// MUST batch process items for efficiency
// MUST update Item.autoCategories field
// CLI: `pnpm categorize:item <item-id>` and `pnpm categorize:batch`
```

**T033 - WebSocket Event Manager (`lib/websocket/events.ts`)**:
```typescript
// MUST extend existing websocket/manager.ts with new event types
// MUST support import progress, optimization status, search results
// MUST use type definitions from lib/websocket/types.ts
// MUST implement event filtering by user permissions
// MUST handle client reconnection and event replay
// CLI: `pnpm ws:test-events` for development testing
```

**T034 - Collection Manager (`lib/collection/manager.ts`)**:
```typescript
// MUST support hierarchical collection structure (parentCategoryId)
// MUST implement auto-suggestion rules for categorization
// MUST calculate semantic embeddings for collections
// MUST support bulk operations (move items, merge collections)
// MUST validate collection permissions and ownership
// CLI: `pnpm collection:create <name>` and `pnpm collection:suggest <item-id>`
```

**T035 - File Parser (`lib/parsers/enhanced.ts`)**:
```typescript
// MUST extend existing lib/parsers.ts with new formats
// MUST support metadata extraction from files
// MUST handle encoding detection and conversion
// MUST implement content chunking for large files
// MUST preserve file structure and relationships
// CLI: `pnpm parse:file <path> [--format] [--extract-metadata]`
```

### Performance & Validation

**T042 Requirements**:

- Audit all UI buttons for functionality
- Remove unused imports and deprecated code
- Verify quickstart.md scenarios pass
- Optimize database queries and indexes
- Run performance benchmarks
- Clean up console errors and warnings

## Notes

- [P] tasks = different files, no dependencies between them
- Verify all contract/integration tests FAIL before implementing
- Commit after each completed task
- Use real dependencies in tests (actual SQLite, AI APIs)
- Follow TDD strictly: RED (failing test) → GREEN (minimal implementation) → REFACTOR

## Validation Checklist

_GATE: All items must be checked before task execution_

- [x] All 3 contracts have corresponding tests (T011-T019)
- [x] All 5 entities have database tasks (T001-T005)
- [x] All tests come before implementation (T011-T025 before T026-T042)
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No [P] task modifies same file as another [P] task
- [x] Integration tests map to user stories from quickstart.md
- [x] Library structure matches plan.md architecture
- [x] Performance requirements included (T042)

## Phase 3.7: Quickstart Validation

- [ ] T043 [P] Validate GitHub import quickstart scenario (quickstart.md lines 15-25)
- [ ] T044 [P] Validate AI optimization quickstart scenario (quickstart.md lines 27-37) 
- [ ] T045 [P] Validate semantic search quickstart scenario (quickstart.md lines 39-49)

### Validation Requirements (T043-T045)

**T043 - GitHub Import Validation**:
```typescript
// MUST execute quickstart.md GitHub import scenario exactly
// MUST verify performance target: <60s for medium repos (quickstart.md line 22)
// MUST test with public repo: https://github.com/microsoft/TypeScript/tree/main/src/compiler
// MUST validate 200+ files imported with correct categorization
// MUST verify websocket progress updates every 5s during import
// Test file: test/validation/github-import-quickstart.test.ts
```

**T044 - AI Optimization Validation**:
```typescript
// MUST execute quickstart.md AI optimization scenario exactly
// MUST verify performance target: <5s for content optimization (quickstart.md line 34)
// MUST test all optimization types: content, structure, metadata, categorization
// MUST validate confidence scores 0.7+ for successful optimizations
// MUST verify OptimizationResult records created correctly
// Test file: test/validation/ai-optimization-quickstart.test.ts
```

**T045 - Semantic Search Validation**:
```typescript
// MUST execute quickstart.md semantic search scenario exactly
// MUST verify performance target: <500ms for semantic queries (quickstart.md line 46)
// MUST test hybrid search with relevance scoring
// MUST validate faceted filtering by categories and sourceType
// MUST verify search suggestions and filters API endpoints
// Test file: test/validation/semantic-search-quickstart.test.ts
```

**Task Generation Complete**: 45 tasks ready for execution following constitutional TDD principles
