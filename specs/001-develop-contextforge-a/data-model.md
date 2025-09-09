# Data Model: ContextForge Platform Development

## Enhanced Entity Definitions

### Context Artifact (Enhanced Item Model)

**Purpose**: Core entity representing any reusable AI development resource
**Current Model**: Item (from schema.prisma)
**Enhancements Needed**:

- `aiOptimizationStatus`: enum('none', 'pending', 'optimized', 'failed')
- `originalContent`: text (preserve original before AI optimization)
- `optimizedContent`: text (AI-enhanced version)
- `autoCategories`: JSON array (AI-suggested categories)
- `confidence`: float (AI categorization confidence score)
- `sourceType`: enum('manual', 'github', 'local', 'imported')
- `sourceMetadata`: JSON (import source details)

**Relationships**:

- User (owner) - existing
- Collection (organization) - existing
- Import (batch import tracking) - existing
- OptimizationHistory (new) - tracks AI optimization attempts
- CategorySuggestion (new) - AI categorization proposals

**Validation Rules**:

- Content must be non-empty for optimization
- Confidence score between 0.0-1.0
- Source metadata required for imported items

### Category (Enhanced Collection Model)

**Purpose**: AI-powered classification system for organizing artifacts
**Current Model**: Collection (from schema.prisma)
**Enhancements Needed**:

- `categoryType`: enum('manual', 'ai_suggested', 'ai_confirmed')
- `semanticEmbedding`: binary (vector representation for similarity)
- `autoSuggestionRules`: JSON (AI categorization patterns)
- `confidence`: float (AI suggestion confidence)
- `parentCategoryId`: string (hierarchical organization)

**Relationships**:

- Items (many-to-many through ItemCategory junction)
- Parent/Child categories (self-referential)
- User (creator/owner) - existing
- CategoryRules (new) - automation patterns

**Validation Rules**:

- Category depth maximum 10 levels
- Names must be unique within parent scope
- AI confidence required for ai_suggested/ai_confirmed types

### Import Source (Enhanced Import Model)

**Purpose**: Track and manage external artifact sources
**Current Model**: Import (from schema.prisma)
**Enhancements Needed**:

- `sourceType`: enum('github_repo', 'github_file', 'local_folder', 'local_file')
- `sourceUrl`: string (GitHub URL or local path)
- `importSettings`: JSON (filtering, categorization preferences)
- `scheduledSync`: boolean (auto-refresh capability)
- `syncFrequency`: string (cron expression)
- `lastSyncAt`: datetime
- `syncStatus`: enum('idle', 'syncing', 'failed', 'completed')

**Relationships**:

- User (initiator) - existing
- Items (imported artifacts) - existing
- ImportErrors (new) - error tracking
- SyncHistory (new) - historical sync records

**Validation Rules**:

- GitHub URLs must be valid repository or file URLs
- Local paths must exist and be accessible
- Sync frequency must be valid cron expression

### Optimization Result (New Model)

**Purpose**: Track AI-powered artifact improvements
**Database Table**: `OptimizationResult`
**Fields**:

- `id`: string (CUID)
- `itemId`: string (foreign key to Item)
- `optimizationType`: enum('content', 'structure', 'metadata', 'categorization')
- `originalVersion`: text
- `optimizedVersion`: text
- `improvementNotes`: text
- `confidence`: float
- `aiProvider`: string ('openai', 'anthropic', 'gemini')
- `processingTime`: integer (milliseconds)
- `userFeedback`: enum('accepted', 'rejected', 'modified')
- `createdAt`: datetime
- `acceptedAt`: datetime

**Relationships**:

- Item (optimized artifact)
- User (feedback provider)

**Validation Rules**:

- Both versions required for comparison
- Confidence score 0.0-1.0
- Processing time positive integer

### User Workspace (Enhanced User Model)

**Purpose**: Personalized artifact management environment
**Current Model**: User (from schema.prisma)
**Enhancements Needed**:

- `workspaceSettings`: JSON (UI preferences, defaults)
- `aiPreferences`: JSON (preferred providers, optimization settings)
- `importPreferences`: JSON (default categorization, filtering)
- `searchPreferences`: JSON (result ranking, filters)
- `automationLevel`: enum('manual', 'assisted', 'automatic') - existing

**Relationships**:

- All existing relationships maintained
- WorkspaceTemplates (new) - saved workspace configurations
- SearchHistory (enhanced) - semantic search tracking

**Validation Rules**:

- Settings JSON must conform to schema
- Automation level affects AI behavior
- Preferences must be valid configuration objects

## New Supporting Entities

### ItemCategory (Junction Table)

**Purpose**: Many-to-many relationship between Items and Categories
**Fields**:

- `itemId`: string
- `categoryId`: string
- `confidence`: float
- `isAiSuggested`: boolean
- `createdAt`: datetime
- `confirmedAt`: datetime

### OptimizationQueue

**Purpose**: Background processing queue for AI optimization
**Fields**:

- `id`: string
- `itemId`: string
- `optimizationType`: enum
- `priority`: integer
- `status`: enum('pending', 'processing', 'completed', 'failed')
- `attempts`: integer
- `errorMessage`: text
- `scheduledAt`: datetime
- `startedAt`: datetime
- `completedAt`: datetime

### SearchAnalytics

**Purpose**: Track search patterns for improvement
**Fields**:

- `id`: string
- `userId`: string
- `query`: text
- `searchType`: enum('text', 'semantic', 'category')
- `resultCount`: integer
- `clickedResults`: JSON array
- `searchTime`: integer (milliseconds)
- `createdAt`: datetime

## Data Relationships Matrix

| Entity             | User | Item | Collection         | Import | OptimizationResult |
| ------------------ | ---- | ---- | ------------------ | ------ | ------------------ |
| User               | -    | 1:M  | 1:M                | 1:M    | 1:M (feedback)     |
| Item               | M:1  | -    | M:M                | M:1    | 1:M                |
| Collection         | M:1  | M:M  | 1:M (parent/child) | -      | -                  |
| Import             | M:1  | 1:M  | -                  | -      | -                  |
| OptimizationResult | M:1  | M:1  | -                  | -      | -                  |

## State Transitions

### Item Lifecycle

```
Manual Creation → [content] → Ready for Optimization
Import → [processing] → Ready for Categorization → Ready for Optimization
Optimization Pending → [AI processing] → Optimized | Failed
Optimized → [user review] → Accepted | Rejected → [possible re-optimization]
```

### Import Lifecycle

```
Initiated → [scanning] → Processing → [importing items] → Completed | Failed
Scheduled → [waiting] → Active → [sync] → Updated → Idle
```

### Category Assignment

```
Item Created → [AI analysis] → Categories Suggested → [user review] → Confirmed | Modified
Manual Assignment → [immediate] → Confirmed
```

## Validation and Constraints

### Database Constraints

- All foreign keys with CASCADE DELETE for user data
- Unique constraints on category names within parent scope
- Check constraints on confidence scores (0.0-1.0)
- Text field length limits for performance

### Business Rules

- Items cannot be optimized without original content
- Categories cannot exceed 10 levels of nesting
- Import sources must be validated before processing
- AI confidence below 0.3 triggers manual review
- Users can override all AI suggestions

### Performance Considerations

- Index on item content for search performance
- Vector similarity indexes for semantic search
- Composite indexes on user_id + created_at for timeline queries
- Partial indexes on AI-generated fields

## Migration Strategy

1. Add new fields to existing tables with default values
2. Create new tables for optimization and analytics
3. Populate missing data through background jobs
4. Update application code to use enhanced models
5. Remove deprecated fields after validation
