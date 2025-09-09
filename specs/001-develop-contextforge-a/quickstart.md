# ContextForge Platform Development - Quickstart Guide

## Overview

This quickstart guide validates the core functionality of the enhanced ContextForge platform through integration test scenarios based on user stories.

## Prerequisites

- Node.js 18+ installed
- Git repository cloned locally
- pnpm package manager
- SQLite database setup

## Quick Setup

### 1. Environment Setup

```bash
# Install dependencies
pnpm install

# Setup database
npx prisma migrate dev

# Start development server
pnpm dev
```

### 2. Verify Base Installation

```bash
# Check server is running
curl http://localhost:3001/api/health

# Verify database connection
npx prisma db push
```

## Core Feature Validation

### Test Scenario 1: Import from GitHub Repository

**User Story**: Import context artifacts from GitHub repositories with full fidelity

**Steps**:

1. Navigate to `/dashboard/import`
2. Select "GitHub Repository" option
3. Enter test repository URL: `https://github.com/anthropics/claude-prompt-library`
4. Configure import filters:
   - File types: `.md`, `.txt`
   - Exclude paths: `node_modules`, `.git`
5. Click "Start Import"
6. Monitor progress at `/dashboard/imports/{import-id}`

**Expected Results**:

- Import job created with status "queued"
- Background processing begins within 5 seconds
- Progress updates show file count and current processing
- Completion shows imported items count
- Items appear in dashboard with GitHub source type
- Auto-categorization applies to imported content

**Validation Commands**:

```bash
# Check import status
curl http://localhost:3001/api/import/{jobId}/status

# Verify items created
curl http://localhost:3001/api/items?sourceType=github
```

### Test Scenario 2: Local Folder Import

**User Story**: Import context artifacts from local folders with proper categorization

**Steps**:

1. Create test folder structure:

   ```
   test-artifacts/
   ├── prompts/
   │   ├── coding.md
   │   └── writing.md
   ├── configs/
   │   ├── claude.json
   │   └── settings.yaml
   └── templates/
       └── project-template.md
   ```

2. Navigate to `/dashboard/import`
3. Select "Local Folder" option
4. Upload folder structure (drag & drop)
5. Enable "Preserve Structure" and "Auto-Categorize"
6. Start import process

**Expected Results**:

- Folder hierarchy preserved as collections
- Files imported with correct content types
- Auto-categorization suggests appropriate categories
- File tree structure matches original layout

**Validation Commands**:

```bash
# Check collections created
curl http://localhost:3001/api/collections?type=folder

# Verify preserved hierarchy
curl http://localhost:3001/api/collections/{collection-id}/items
```

### Test Scenario 3: AI-Powered Optimization

**User Story**: Improve context artifacts using AI optimization

**Steps**:

1. Select any imported item from dashboard
2. Click "Optimize with AI" button
3. Choose optimization type: "Content Enhancement"
4. Select AI provider (or use auto-selection)
5. Review optimization results
6. Accept or reject suggested improvements

**Expected Results**:

- Original content preserved
- Optimized version generated
- Improvement notes provided
- Confidence score displayed (0.0-1.0)
- User can accept/reject changes
- Optimization history tracked

**Validation Commands**:

```bash
# Trigger optimization
curl -X POST http://localhost:3001/api/ai/optimize \
  -H "Content-Type: application/json" \
  -d '{"itemId": "item123", "optimizationType": "content"}'

# Check optimization status
curl http://localhost:3001/api/ai/optimize/{jobId}/status
```

### Test Scenario 4: Semantic Search and Filtering

**User Story**: Efficiently find context artifacts using advanced search

**Steps**:

1. Navigate to main dashboard
2. Use search bar with query: "coding prompts"
3. Apply filters:
   - Source type: GitHub
   - Category: Development
   - Optimized: Yes
4. Switch between search modes (text/semantic/hybrid)
5. Sort results by relevance

**Expected Results**:

- Relevant results appear within 500ms
- Semantic search finds related content
- Filters reduce result set appropriately
- Result highlights show matching terms
- Faceted filtering options display counts

**Validation Commands**:

```bash
# Semantic search test
curl "http://localhost:3001/api/search?q=coding+prompts&type=semantic&limit=10"

# Filtered search test
curl "http://localhost:3001/api/search?q=*&categories=development&sourceType=github"

# Get available filters
curl http://localhost:3001/api/search/filters
```

### Test Scenario 5: Functional Button Validation

**User Story**: All UI buttons perform their intended actions correctly

**Steps**:

1. Systematically test each interactive element:
   - Dashboard navigation buttons
   - Import action buttons
   - Optimization controls
   - Search and filter buttons
   - Category management buttons
   - Settings and preferences
2. Verify each button:
   - Shows loading state during processing
   - Provides feedback on completion
   - Handles errors gracefully
   - Updates UI state appropriately

**Expected Results**:

- All buttons respond within 100ms
- Loading states prevent double-clicks
- Success/error feedback displayed
- UI updates reflect backend changes
- No broken or non-functional buttons

**Validation Checklist**:

- [ ] Navigation buttons change routes
- [ ] Import buttons start processes
- [ ] Optimization buttons queue jobs
- [ ] Search buttons execute queries
- [ ] Category buttons modify organization
- [ ] Settings buttons save preferences

### Test Scenario 6: Code Cleanup Verification

**User Story**: Remove obsolete code and improve codebase health

**Steps**:

1. Run cleanup analysis:

   ```bash
   pnpm run lint
   npm audit
   ```

2. Check for unused imports/exports
3. Verify removed deprecated functionality
4. Test that existing features still work
5. Validate performance improvements

**Expected Results**:

- Lint warnings reduced significantly
- No unused dependencies in package.json
- Deprecated API calls removed
- Bundle size optimized
- Application startup time improved

## Performance Benchmarks

### Import Performance

- **GitHub Repository (100 files)**: < 30 seconds
- **Local Folder (500 files)**: < 60 seconds
- **Memory usage during import**: < 500MB

### Search Performance

- **Text search response**: < 200ms
- **Semantic search response**: < 500ms
- **Filter application**: < 100ms

### AI Optimization

- **Content optimization**: < 10 seconds
- **Batch optimization (10 items)**: < 60 seconds
- **Categorization suggestions**: < 5 seconds

## Integration Test Commands

### Run Full Test Suite

```bash
# Run all integration tests
pnpm test:integration

# Run specific test categories
pnpm test:import
pnpm test:search
pnpm test:ai-optimization

# Performance benchmarks
pnpm test:performance
```

### Database Verification

```bash
# Check data consistency
npx prisma db seed

# Verify relationships
npx prisma studio
```

### API Health Checks

```bash
# Test all endpoints
pnpm test:api

# Load testing
pnpm test:load
```

## Troubleshooting

### Common Issues

1. **Import fails**: Check GitHub token permissions
2. **Search slow**: Verify database indexes
3. **AI optimization errors**: Validate API keys
4. **Button not working**: Check browser console for errors

### Debug Commands

```bash
# Enable debug logging
DEBUG=contextforge:* pnpm dev

# Database query analysis
npx prisma db execute --file debug.sql

# Performance profiling
node --inspect pnpm dev
```

## Success Criteria

- ✅ All imports complete successfully
- ✅ Search returns relevant results < 500ms
- ✅ AI optimization improves content quality
- ✅ All buttons function as intended
- ✅ No broken functionality after cleanup
- ✅ Performance meets benchmarks

This quickstart guide serves as both documentation and validation test suite for the ContextForge platform development feature.
