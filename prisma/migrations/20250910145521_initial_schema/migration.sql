-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "settings" TEXT NOT NULL DEFAULT '{}',
    "automationLevel" TEXT NOT NULL DEFAULT 'auto-suggest',
    "preferences" TEXT NOT NULL DEFAULT '{}'
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subType" TEXT,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "author" TEXT,
    "language" TEXT,
    "targetModels" TEXT,
    "sourceId" TEXT,
    "isCanonical" BOOLEAN NOT NULL DEFAULT false,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "canonicalId" TEXT,
    "aiOptimizationStatus" TEXT NOT NULL DEFAULT 'none',
    "originalContent" TEXT,
    "optimizedContent" TEXT,
    "autoCategories" TEXT NOT NULL DEFAULT '[]',
    "confidence" REAL,
    "sourceType" TEXT,
    "sourceMetadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Item_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Item_canonicalId_fkey" FOREIGN KEY ("canonicalId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Version" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "changeReason" TEXT,
    "changedBy" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Version_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "filePath" TEXT,
    "repoOwner" TEXT,
    "repoName" TEXT,
    "branch" TEXT,
    "pathGlob" TEXT,
    "lastImportedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ItemTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItemTag_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "path" TEXT,
    "parentId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "isFolder" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "autoOrganize" BOOLEAN NOT NULL DEFAULT false,
    "organizationRules" TEXT NOT NULL DEFAULT '{}',
    "permissions" TEXT NOT NULL DEFAULT '{}',
    "analytics" TEXT NOT NULL DEFAULT '{}',
    "categoryType" TEXT,
    "semanticEmbedding" TEXT,
    "autoSuggestionRules" TEXT NOT NULL DEFAULT '{}',
    "parentCategoryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Collection_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Collection_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "Collection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemCollection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItemCollection_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemCollection_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Import" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT,
    "status" TEXT NOT NULL,
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "processedFiles" INTEGER NOT NULL DEFAULT 0,
    "failedFiles" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "errorLog" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "importSettings" TEXT NOT NULL DEFAULT '{}',
    "scheduledSync" BOOLEAN NOT NULL DEFAULT false,
    "syncFrequency" TEXT,
    "lastSyncAt" DATETIME,
    "syncStatus" TEXT NOT NULL DEFAULT 'none',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Import_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Import_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StagedItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "importId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originalPath" TEXT,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "size" INTEGER,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedAt" DATETIME,
    "reviewedBy" TEXT,
    "importedItemId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StagedItem_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Optimization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "targetModel" TEXT NOT NULL,
    "optimizedContent" TEXT NOT NULL,
    "confidence" REAL,
    "status" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "reviewedBy" TEXT,
    CONSTRAINT "Optimization_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Conversion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "fromFormat" TEXT NOT NULL,
    "toFormat" TEXT NOT NULL,
    "convertedContent" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "reviewedBy" TEXT,
    CONSTRAINT "Conversion_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "itemId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "previousValue" TEXT,
    "newValue" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowQueue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "payload" TEXT NOT NULL,
    "result" TEXT,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "scheduledFor" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FolderSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "suggestedPath" TEXT NOT NULL,
    "rationale" TEXT,
    "confidence" REAL NOT NULL DEFAULT 0.0,
    "itemIds" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "appliedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FolderSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FolderTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "structure" TEXT NOT NULL,
    "rules" TEXT NOT NULL DEFAULT '{}',
    "category" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ItemEmbedding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "embedding" TEXT NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "tokenCount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ItemEmbedding_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SemanticCluster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "centroid" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "threshold" REAL NOT NULL,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SemanticClusterItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clusterId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "similarity" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SemanticClusterItem_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "SemanticCluster" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SemanticClusterItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContextTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "template" TEXT NOT NULL,
    "variables" TEXT NOT NULL DEFAULT '{}',
    "targetModel" TEXT,
    "category" TEXT,
    "quality" REAL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContextTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContextTemplateItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "role" TEXT,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContextTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ContextTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContextTemplateItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContextGeneration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "templateId" TEXT,
    "intent" TEXT NOT NULL,
    "query" TEXT,
    "assemblyStrategy" TEXT NOT NULL,
    "generatedContext" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "cost" REAL,
    "targetModel" TEXT,
    "quality" REAL,
    "confidence" REAL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContextGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContextGeneration_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ContextTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContextGenerationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "generationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "relevanceScore" REAL,
    "includedTokens" INTEGER,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContextGenerationItem_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "ContextGeneration" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContextGenerationItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModelOptimization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "targetModel" TEXT NOT NULL,
    "optimizedContent" TEXT NOT NULL,
    "originalTokens" INTEGER,
    "optimizedTokens" INTEGER,
    "tokenSavings" INTEGER,
    "costEstimate" REAL,
    "qualityScore" REAL,
    "strategy" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    CONSTRAINT "ModelOptimization_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentSummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "keyPoints" TEXT NOT NULL DEFAULT '[]',
    "entities" TEXT NOT NULL DEFAULT '[]',
    "concepts" TEXT NOT NULL DEFAULT '[]',
    "complexity" TEXT,
    "readabilityScore" REAL,
    "sentimentScore" REAL,
    "language" TEXT,
    "wordCount" INTEGER,
    "createdBy" TEXT NOT NULL,
    "confidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContentSummary_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SemanticSearch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "queryEmbedding" TEXT NOT NULL,
    "results" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL,
    "algorithm" TEXT NOT NULL,
    "threshold" REAL NOT NULL,
    "executionTime" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SemanticSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScheduledExport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "timeRange" TEXT NOT NULL,
    "sections" TEXT NOT NULL,
    "includeCharts" BOOLEAN NOT NULL DEFAULT true,
    "includeRawData" BOOLEAN NOT NULL DEFAULT false,
    "recipients" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "scheduledTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nextExecution" DATETIME NOT NULL,
    "lastExecution" DATETIME,
    "customTitle" TEXT,
    "customDescription" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScheduledExport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OptimizationResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "optimizationType" TEXT NOT NULL,
    "originalVersion" TEXT NOT NULL,
    "optimizedVersion" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "aiProvider" TEXT NOT NULL,
    "aiModel" TEXT NOT NULL,
    "processingTime" INTEGER,
    "tokenUsage" TEXT NOT NULL DEFAULT '{}',
    "costEstimate" REAL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OptimizationResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OptimizationResult_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OptimizationQueue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "optimizationType" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'queued',
    "aiProvider" TEXT,
    "estimatedTime" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "scheduledFor" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OptimizationQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OptimizationQueue_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "aiProvider" TEXT,
    "reasoning" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItemCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemCategory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Item_userId_type_idx" ON "Item"("userId", "type");

-- CreateIndex
CREATE INDEX "Item_name_idx" ON "Item"("name");

-- CreateIndex
CREATE INDEX "Version_itemId_idx" ON "Version"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Version_itemId_versionNumber_key" ON "Version"("itemId", "versionNumber");

-- CreateIndex
CREATE INDEX "Source_type_idx" ON "Source"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "ItemTag_itemId_idx" ON "ItemTag"("itemId");

-- CreateIndex
CREATE INDEX "ItemTag_tagId_idx" ON "ItemTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemTag_itemId_tagId_key" ON "ItemTag"("itemId", "tagId");

-- CreateIndex
CREATE INDEX "Collection_userId_idx" ON "Collection"("userId");

-- CreateIndex
CREATE INDEX "Collection_parentId_idx" ON "Collection"("parentId");

-- CreateIndex
CREATE INDEX "Collection_path_idx" ON "Collection"("path");

-- CreateIndex
CREATE INDEX "Collection_level_idx" ON "Collection"("level");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_userId_path_key" ON "Collection"("userId", "path");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_userId_parentId_name_key" ON "Collection"("userId", "parentId", "name");

-- CreateIndex
CREATE INDEX "ItemCollection_itemId_idx" ON "ItemCollection"("itemId");

-- CreateIndex
CREATE INDEX "ItemCollection_collectionId_idx" ON "ItemCollection"("collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemCollection_itemId_collectionId_key" ON "ItemCollection"("itemId", "collectionId");

-- CreateIndex
CREATE INDEX "Import_userId_idx" ON "Import"("userId");

-- CreateIndex
CREATE INDEX "Import_status_idx" ON "Import"("status");

-- CreateIndex
CREATE INDEX "StagedItem_importId_idx" ON "StagedItem"("importId");

-- CreateIndex
CREATE INDEX "StagedItem_status_idx" ON "StagedItem"("status");

-- CreateIndex
CREATE INDEX "StagedItem_createdAt_idx" ON "StagedItem"("createdAt");

-- CreateIndex
CREATE INDEX "Optimization_itemId_targetModel_idx" ON "Optimization"("itemId", "targetModel");

-- CreateIndex
CREATE INDEX "Optimization_status_idx" ON "Optimization"("status");

-- CreateIndex
CREATE INDEX "Conversion_itemId_idx" ON "Conversion"("itemId");

-- CreateIndex
CREATE INDEX "Conversion_status_idx" ON "Conversion"("status");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_itemId_idx" ON "AuditLog"("itemId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "WorkflowQueue_status_priority_idx" ON "WorkflowQueue"("status", "priority");

-- CreateIndex
CREATE INDEX "WorkflowQueue_type_idx" ON "WorkflowQueue"("type");

-- CreateIndex
CREATE INDEX "FolderSuggestion_userId_idx" ON "FolderSuggestion"("userId");

-- CreateIndex
CREATE INDEX "FolderSuggestion_status_idx" ON "FolderSuggestion"("status");

-- CreateIndex
CREATE INDEX "FolderSuggestion_createdAt_idx" ON "FolderSuggestion"("createdAt");

-- CreateIndex
CREATE INDEX "FolderTemplate_category_idx" ON "FolderTemplate"("category");

-- CreateIndex
CREATE INDEX "FolderTemplate_isPublic_idx" ON "FolderTemplate"("isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "ItemEmbedding_itemId_key" ON "ItemEmbedding"("itemId");

-- CreateIndex
CREATE INDEX "ItemEmbedding_itemId_idx" ON "ItemEmbedding"("itemId");

-- CreateIndex
CREATE INDEX "ItemEmbedding_provider_model_idx" ON "ItemEmbedding"("provider", "model");

-- CreateIndex
CREATE INDEX "SemanticCluster_algorithm_idx" ON "SemanticCluster"("algorithm");

-- CreateIndex
CREATE INDEX "SemanticCluster_itemCount_idx" ON "SemanticCluster"("itemCount");

-- CreateIndex
CREATE INDEX "SemanticClusterItem_clusterId_idx" ON "SemanticClusterItem"("clusterId");

-- CreateIndex
CREATE INDEX "SemanticClusterItem_itemId_idx" ON "SemanticClusterItem"("itemId");

-- CreateIndex
CREATE INDEX "SemanticClusterItem_similarity_idx" ON "SemanticClusterItem"("similarity");

-- CreateIndex
CREATE UNIQUE INDEX "SemanticClusterItem_clusterId_itemId_key" ON "SemanticClusterItem"("clusterId", "itemId");

-- CreateIndex
CREATE INDEX "ContextTemplate_userId_idx" ON "ContextTemplate"("userId");

-- CreateIndex
CREATE INDEX "ContextTemplate_category_idx" ON "ContextTemplate"("category");

-- CreateIndex
CREATE INDEX "ContextTemplate_targetModel_idx" ON "ContextTemplate"("targetModel");

-- CreateIndex
CREATE INDEX "ContextTemplate_quality_idx" ON "ContextTemplate"("quality");

-- CreateIndex
CREATE INDEX "ContextTemplateItem_templateId_idx" ON "ContextTemplateItem"("templateId");

-- CreateIndex
CREATE INDEX "ContextTemplateItem_itemId_idx" ON "ContextTemplateItem"("itemId");

-- CreateIndex
CREATE INDEX "ContextTemplateItem_position_idx" ON "ContextTemplateItem"("position");

-- CreateIndex
CREATE UNIQUE INDEX "ContextTemplateItem_templateId_itemId_key" ON "ContextTemplateItem"("templateId", "itemId");

-- CreateIndex
CREATE INDEX "ContextGeneration_userId_idx" ON "ContextGeneration"("userId");

-- CreateIndex
CREATE INDEX "ContextGeneration_templateId_idx" ON "ContextGeneration"("templateId");

-- CreateIndex
CREATE INDEX "ContextGeneration_targetModel_idx" ON "ContextGeneration"("targetModel");

-- CreateIndex
CREATE INDEX "ContextGeneration_quality_idx" ON "ContextGeneration"("quality");

-- CreateIndex
CREATE INDEX "ContextGeneration_createdAt_idx" ON "ContextGeneration"("createdAt");

-- CreateIndex
CREATE INDEX "ContextGenerationItem_generationId_idx" ON "ContextGenerationItem"("generationId");

-- CreateIndex
CREATE INDEX "ContextGenerationItem_itemId_idx" ON "ContextGenerationItem"("itemId");

-- CreateIndex
CREATE INDEX "ContextGenerationItem_position_idx" ON "ContextGenerationItem"("position");

-- CreateIndex
CREATE INDEX "ContextGenerationItem_relevanceScore_idx" ON "ContextGenerationItem"("relevanceScore");

-- CreateIndex
CREATE UNIQUE INDEX "ContextGenerationItem_generationId_itemId_key" ON "ContextGenerationItem"("generationId", "itemId");

-- CreateIndex
CREATE INDEX "ModelOptimization_itemId_idx" ON "ModelOptimization"("itemId");

-- CreateIndex
CREATE INDEX "ModelOptimization_targetModel_idx" ON "ModelOptimization"("targetModel");

-- CreateIndex
CREATE INDEX "ModelOptimization_status_idx" ON "ModelOptimization"("status");

-- CreateIndex
CREATE INDEX "ModelOptimization_qualityScore_idx" ON "ModelOptimization"("qualityScore");

-- CreateIndex
CREATE UNIQUE INDEX "ModelOptimization_itemId_targetModel_key" ON "ModelOptimization"("itemId", "targetModel");

-- CreateIndex
CREATE UNIQUE INDEX "ContentSummary_itemId_key" ON "ContentSummary"("itemId");

-- CreateIndex
CREATE INDEX "ContentSummary_complexity_idx" ON "ContentSummary"("complexity");

-- CreateIndex
CREATE INDEX "ContentSummary_language_idx" ON "ContentSummary"("language");

-- CreateIndex
CREATE INDEX "ContentSummary_confidence_idx" ON "ContentSummary"("confidence");

-- CreateIndex
CREATE INDEX "SemanticSearch_userId_idx" ON "SemanticSearch"("userId");

-- CreateIndex
CREATE INDEX "SemanticSearch_createdAt_idx" ON "SemanticSearch"("createdAt");

-- CreateIndex
CREATE INDEX "ScheduledExport_userId_idx" ON "ScheduledExport"("userId");

-- CreateIndex
CREATE INDEX "ScheduledExport_nextExecution_idx" ON "ScheduledExport"("nextExecution");

-- CreateIndex
CREATE INDEX "ScheduledExport_isActive_idx" ON "ScheduledExport"("isActive");

-- CreateIndex
CREATE INDEX "OptimizationResult_userId_idx" ON "OptimizationResult"("userId");

-- CreateIndex
CREATE INDEX "OptimizationResult_itemId_idx" ON "OptimizationResult"("itemId");

-- CreateIndex
CREATE INDEX "OptimizationResult_optimizationType_idx" ON "OptimizationResult"("optimizationType");

-- CreateIndex
CREATE INDEX "OptimizationResult_status_idx" ON "OptimizationResult"("status");

-- CreateIndex
CREATE INDEX "OptimizationResult_aiProvider_idx" ON "OptimizationResult"("aiProvider");

-- CreateIndex
CREATE INDEX "OptimizationResult_createdAt_idx" ON "OptimizationResult"("createdAt");

-- CreateIndex
CREATE INDEX "OptimizationQueue_status_priority_idx" ON "OptimizationQueue"("status", "priority");

-- CreateIndex
CREATE INDEX "OptimizationQueue_userId_idx" ON "OptimizationQueue"("userId");

-- CreateIndex
CREATE INDEX "OptimizationQueue_itemId_idx" ON "OptimizationQueue"("itemId");

-- CreateIndex
CREATE INDEX "OptimizationQueue_scheduledFor_idx" ON "OptimizationQueue"("scheduledFor");

-- CreateIndex
CREATE INDEX "OptimizationQueue_createdAt_idx" ON "OptimizationQueue"("createdAt");

-- CreateIndex
CREATE INDEX "ItemCategory_userId_idx" ON "ItemCategory"("userId");

-- CreateIndex
CREATE INDEX "ItemCategory_itemId_idx" ON "ItemCategory"("itemId");

-- CreateIndex
CREATE INDEX "ItemCategory_categoryName_idx" ON "ItemCategory"("categoryName");

-- CreateIndex
CREATE INDEX "ItemCategory_confidence_idx" ON "ItemCategory"("confidence");

-- CreateIndex
CREATE INDEX "ItemCategory_isApproved_idx" ON "ItemCategory"("isApproved");

-- CreateIndex
CREATE UNIQUE INDEX "ItemCategory_itemId_categoryName_key" ON "ItemCategory"("itemId", "categoryName");
