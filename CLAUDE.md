# ContextForge - Claude Code AI Assistant Context

## Project Overview

ContextForge is a unified, local-first platform for collecting, organizing, optimizing, and personalizing context artifacts for AI-powered software development. This includes prompts, agent definitions, IDE rules, configurations, and other development resources.

## Current Development Phase

**Feature**: ContextForge Platform Development (Branch: 001-develop-contextforge-a)
**Status**: Implementation planning complete, ready for task generation
**Priority**: Core platform functionality - AI optimization, categorization, imports

## Technology Stack

- **Frontend**: Next.js 15.4.6 + React 19.1.0 + TypeScript 5.x
- **Backend**: Next.js API routes + Node.js
- **Database**: SQLite + Prisma ORM 6.15.0
- **UI**: Radix UI components + Tailwind CSS
- **AI**: Multiple providers (OpenAI, Anthropic, Google) with encrypted key storage
- **Queue**: Bull with Redis for background processing
- **File Processing**: Formidable, PapaParse, Gray-matter, XML2JS

## Key Architecture Decisions

- **Local-First**: No external dependencies for core functionality
- **Multi-AI**: Support multiple AI providers for resilience
- **Background Processing**: Use existing Bull queue for heavy operations
- **Incremental Enhancement**: Build on existing schema and infrastructure

## Current Database Schema (Key Models)

```prisma
model User {
  // Existing: id, email, name, passwordHash, settings
  // Enhanced: aiPreferences, workspaceSettings, automationLevel
  items             Item[]
  collections       Collection[]
  imports           Import[]
}

model Item {
  // Existing: id, userId, name, content, type, metadata
  // Enhanced: aiOptimizationStatus, originalContent, optimizedContent
  // Enhanced: autoCategories, confidence, sourceType, sourceMetadata
}

model Collection {
  // Existing: id, userId, name, description
  // Enhanced: categoryType, semanticEmbedding, autoSuggestionRules
}
```

## Core Features Being Developed

### 1. AI Optimization Engine

- **Location**: `lib/ai/optimization/`
- **Purpose**: Enhance context artifacts using multiple AI providers
- **Key APIs**:
  - `POST /api/ai/optimize` - Start optimization job
  - `GET /api/ai/optimize/{jobId}/status` - Check progress
- **Background Processing**: Queue-based with Bull

### 2. Enhanced Import System

- **GitHub Import**: `lib/import/github/` - Full repository and file import
- **Local Import**: `lib/import/local/` - Folder structure preservation
- **Key APIs**:
  - `POST /api/import/github` - Import from GitHub URL
  - `POST /api/import/local` - Upload and process local files
- **Auto-Categorization**: AI-powered organization during import

### 3. Advanced Search & Filtering

- **Location**: `lib/search/`
- **Features**: Text, semantic, and hybrid search modes
- **Key APIs**: `GET /api/search` with faceted filtering
- **Performance Target**: <500ms for semantic queries

### 4. Code Cleanup & Optimization

- **Remove**: Unused imports, deprecated code, dead endpoints
- **Optimize**: Bundle size, database queries, UI responsiveness
- **Fix**: Non-functional buttons and broken interactions

## Development Conventions

### File Organization

```
lib/
├── ai/                 # AI optimization and categorization
│   ├── optimization/   # Content enhancement
│   ├── categorization/ # Auto-categorization
│   └── providers/      # AI service integrations
├── import/            # Import processing
│   ├── github/        # GitHub repository import
│   ├── local/         # Local file import
│   └── processors/    # File type processors
├── search/            # Search and filtering
│   ├── semantic/      # Vector-based search
│   ├── text/          # Full-text search
│   └── filters/       # Faceted filtering
└── validation/        # UI interaction fixes
```

### API Patterns

- **Async Operations**: Return job ID, use status endpoints
- **Error Handling**: Structured error responses with context
- **Validation**: Zod schemas for request/response validation
- **Rate Limiting**: Built-in protection for AI API calls

### Testing Strategy

- **Integration Tests**: Real database, actual AI providers
- **Contract Tests**: API schema validation
- **E2E Tests**: Playwright for UI workflows
- **Performance Tests**: Import speed, search response time

## Current Priorities

### High Priority (Immediate)

1. **Fix Button Functionality** - Systematic audit of UI interactions
2. **Enhance GitHub Import** - Repository scanning and file processing
3. **Implement AI Optimization** - Content enhancement pipeline
4. **Auto-Categorization** - AI-powered organization system

### Medium Priority

1. **Advanced Search** - Semantic search with embeddings
2. **Performance Optimization** - Query optimization, caching
3. **Code Cleanup** - Remove deprecated functionality
4. **User Experience** - Improved feedback and loading states

### Constitutional Requirements

- **Library-First**: Each feature as standalone, testable library
- **CLI Support**: Command-line interfaces for all libraries
- **Test-First**: TDD with failing tests before implementation
- **Local-First**: No external dependencies for core functionality

## AI Assistant Guidelines

### When Working on ContextForge

1. **Preserve Existing Schema** - Enhance, don't replace current database design
2. **Use Existing Infrastructure** - Leverage Bull queues, Prisma, existing APIs
3. **Follow Local-First** - No external services for core functionality
4. **Test Integration** - Use real databases and AI providers in tests
5. **Incremental Enhancement** - Build on working foundation

### Key Files to Reference

- `prisma/schema.prisma` - Database schema and relationships
- `lib/parsers.ts` - File processing utilities
- `lib/auth.ts` - Authentication patterns
- `package.json` - Available dependencies and scripts
- API routes in `app/api/` - Existing endpoint patterns

### Common Patterns

- **Error Handling**: Use structured error responses
- **Validation**: Zod schemas for type safety
- **Background Jobs**: Bull queue with Redis
- **File Processing**: Existing parser framework
- **AI Integration**: Multi-provider pattern with fallbacks

## Recent Changes

- Enhanced Prisma schema for AI optimization tracking
- Added queue processing for background operations
- Implemented multi-AI provider support
- Created comprehensive API contracts for new features

**Last Updated**: 2025-09-07
**Current Branch**: 001-develop-contextforge-a
**Next Phase**: Task generation and implementation execution
