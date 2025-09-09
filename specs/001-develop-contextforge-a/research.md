# Research: ContextForge Platform Development

## Technical Context Analysis

### Current Architecture Overview
- **Project Type**: Web application (Next.js 15.4.6 + TypeScript)
- **Database**: SQLite with Prisma ORM (schema shows comprehensive data model)
- **UI Framework**: React 19.1.0 with Radix UI components + Tailwind CSS
- **Authentication**: NextAuth.js with custom JWT implementation
- **File Processing**: Formidable for uploads, PapaParse for CSV, Gray-matter for markdown
- **AI Integration**: Multiple providers (OpenAI, Anthropic, Google) with encrypted API key storage

### Existing Data Model Analysis
From `prisma/schema.prisma`, the application already has:
- **Core entities**: User, Item, Collection, Import
- **AI features**: ContextTemplate, ContextGeneration, SemanticSearch
- **Advanced features**: FolderSuggestion, ScheduledExport, AuditLog
- **Storage**: ApiKey management with encryption

### Research Findings

#### 1. AI Optimization Implementation
**Decision**: Use existing AI provider integrations (OpenAI, Anthropic, Gemini) with structured prompts
**Rationale**: 
- Infrastructure already exists in `lib/ai/` and `lib/llm/`
- Multiple AI providers available for redundancy
- Encrypted API key management already implemented
**Alternatives considered**: 
- Local AI models (rejected: increases complexity, resource requirements)
- Single provider (rejected: reduces resilience)

#### 2. Categorization System
**Decision**: Extend existing Item/Collection model with AI-powered auto-categorization
**Rationale**:
- Database schema already supports hierarchical organization
- Semantic search capabilities exist (`SemanticSearch` model)
- Can leverage existing LLM integrations for classification
**Alternatives considered**:
- Rule-based categorization (rejected: less flexible, requires manual rules)
- Manual-only categorization (rejected: doesn't meet FR-004 requirement)

#### 3. GitHub Import Enhancement
**Decision**: Enhance existing import system with GitHub API integration using Octokit
**Rationale**:
- Octokit dependency already present in package.json
- Import model and infrastructure exists
- Can reuse existing parser framework in `lib/parsers.ts`
**Alternatives considered**:
- Git clone + filesystem parsing (rejected: more complex, storage overhead)
- GitHub webhooks (rejected: adds server complexity for local-first requirement)

#### 4. Local Folder Import Enhancement
**Decision**: Extend existing file upload system with recursive directory processing
**Rationale**:
- Formidable already handles file uploads
- Parser system in `lib/parsers.ts` supports multiple formats
- File tree component exists in UI (`components/file-tree.tsx`)
**Alternatives considered**:
- Electron file system access (rejected: changes deployment model)
- Drag-and-drop only (rejected: doesn't handle deep folder structures)

#### 5. Button Functionality Issues
**Decision**: Systematic audit and fix of UI component event handlers
**Rationale**:
- Radix UI components are properly integrated
- Issue likely in event handling, not component library
- Existing form handling with react-hook-form provides patterns
**Alternatives considered**:
- UI library replacement (rejected: major breaking change)
- Complete rewrite (rejected: scope too large)

#### 6. Code Cleanup Strategy
**Decision**: Incremental removal of unused imports, dead code, and deprecated patterns
**Rationale**:
- TypeScript compiler can identify unused exports
- Existing lint configuration can detect issues
- Gradual approach maintains stability
**Alternatives considered**:
- Complete refactor (rejected: too risky, doesn't align with local-first focus)
- Automated tool cleanup (rejected: may remove intended code)

#### 7. Search and Filtering Enhancement
**Decision**: Enhance existing search with vector embeddings and faceted filtering
**Rationale**:
- SemanticSearch model already exists
- Embedding infrastructure present in `lib/embeddings/`
- Can leverage existing Item metadata fields
**Alternatives considered**:
- Full-text search only (rejected: less intelligent than semantic search)
- External search service (rejected: violates local-first requirement)

#### 8. Performance and Scalability
**Decision**: Optimize existing queue system (Bull/Redis) for batch operations
**Rationale**:
- Bull queue system already configured
- Redis/IORedis dependencies present
- Background processing prevents UI blocking
**Alternatives considered**:
- Synchronous processing (rejected: poor UX for large imports)
- Worker threads (rejected: more complex than existing queue system)

## Technical Specifications

### Language/Version
- **TypeScript 5.x** with Next.js 15.4.6
- **Node.js** (version from existing dependencies)
- **React 19.1.0** with hooks and modern patterns

### Primary Dependencies (Confirmed from package.json)
- **Database**: Prisma 6.15.0 with SQLite
- **UI**: Radix UI components + Tailwind CSS
- **AI**: OpenAI 5.12.2, @anthropic-ai/sdk 0.60.0, @google/generative-ai 0.24.1
- **File Processing**: Formidable, PapaParse, Gray-matter, xml2js
- **Queue**: Bull 4.16.5 with IORedis 5.7.0

### Storage Strategy
- **Primary**: SQLite database with Prisma ORM (existing)
- **Files**: Local file system with metadata in database
- **Vectors**: Store embeddings in database (leverage existing SemanticSearch model)

### Testing Strategy
- **Framework**: Use existing setup (need to verify test configuration)
- **Integration**: Database integration tests with actual SQLite
- **E2E**: Playwright (already configured in dependencies)

### Target Platform
- **Local-first**: Web application running on localhost
- **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **OS**: Cross-platform (Windows, macOS, Linux) via Node.js

### Performance Goals
- **Import Speed**: Handle 1000+ files in <60 seconds (background processing)
- **Search Response**: <500ms for semantic search queries
- **UI Responsiveness**: <100ms for standard interactions

### Constraints
- **Local-Only**: No external API dependencies for core functionality
- **Storage**: SQLite database + local file system only
- **Memory**: Reasonable limits for desktop applications (<1GB typical usage)
- **Network**: GitHub import only external network requirement

### Scale/Scope
- **Users**: Single user per instance (local-first)
- **Items**: Support 10,000+ context artifacts
- **Collections**: Nested hierarchy up to 10 levels deep
- **File Types**: 20+ supported formats (prompts, configs, code, docs)

## Architecture Decisions

### Project Structure
Using **Option 1 (Single Project)** from template:
- Existing Next.js structure aligns with single project pattern
- `app/` for pages and routing
- `lib/` for business logic libraries
- `components/` for UI components
- `prisma/` for database schema and migrations

### Library Architecture
Following constitutional requirements:
- **lib/ai/**: AI optimization and categorization
- **lib/import/**: Enhanced GitHub and local import
- **lib/search/**: Advanced search and filtering
- **lib/cleanup/**: Code maintenance utilities
- **lib/validation/**: Enhanced UI interaction validation

Each library will:
- Export clear public interfaces
- Include CLI commands for testing
- Maintain independent test suites
- Provide llms.txt documentation

## Next Steps (Phase 1)
1. Extract and refine data model from existing schema
2. Generate API contracts for new functionality
3. Create integration test scenarios
4. Design enhanced import workflows
5. Plan AI optimization service interfaces