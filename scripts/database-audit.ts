#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function auditDatabase() {
  console.log('🔍 Starting comprehensive database audit...\n')

  try {
    // Get counts for all major models
    const modelCounts = await Promise.all([
      prisma.user.count().then(count => ({ model: 'User', count })),
      prisma.item.count().then(count => ({ model: 'Item', count })),
      prisma.tag.count().then(count => ({ model: 'Tag', count })),
      prisma.itemTag.count().then(count => ({ model: 'ItemTag', count })),
      prisma.category.count().then(count => ({ model: 'Category', count })),
      prisma.itemCategory.count().then(count => ({ model: 'ItemCategory', count })),
      prisma.collection.count().then(count => ({ model: 'Collection', count })),
      prisma.itemCollection.count().then(count => ({ model: 'ItemCollection', count })),
      prisma.source.count().then(count => ({ model: 'Source', count })),
      prisma.import.count().then(count => ({ model: 'Import', count })),
      prisma.stagedItem.count().then(count => ({ model: 'StagedItem', count })),
      prisma.version.count().then(count => ({ model: 'Version', count })),
      prisma.optimization.count().then(count => ({ model: 'Optimization', count })),
      prisma.conversion.count().then(count => ({ model: 'Conversion', count })),
      prisma.auditLog.count().then(count => ({ model: 'AuditLog', count })),
      prisma.workflowQueue.count().then(count => ({ model: 'WorkflowQueue', count })),
      prisma.folderSuggestion.count().then(count => ({ model: 'FolderSuggestion', count })),
      prisma.itemEmbedding.count().then(count => ({ model: 'ItemEmbedding', count })),
      prisma.semanticCluster.count().then(count => ({ model: 'SemanticCluster', count })),
      prisma.contextTemplate.count().then(count => ({ model: 'ContextTemplate', count })),
      prisma.contextGeneration.count().then(count => ({ model: 'ContextGeneration', count })),
      prisma.modelOptimization.count().then(count => ({ model: 'ModelOptimization', count })),
      prisma.contentSummary.count().then(count => ({ model: 'ContentSummary', count })),
      prisma.semanticSearch.count().then(count => ({ model: 'SemanticSearch', count })),
      prisma.scheduledExport.count().then(count => ({ model: 'ScheduledExport', count })),
      prisma.optimizationResult.count().then(count => ({ model: 'OptimizationResult', count })),
      prisma.optimizationQueue.count().then(count => ({ model: 'OptimizationQueue', count })),
    ])

    console.log('📊 Model Record Counts:')
    console.log('=' . repeat(50))

    const usedModels = modelCounts.filter(m => m.count > 0)
    const unusedModels = modelCounts.filter(m => m.count === 0)

    console.log('\n✅ Models with data:')
    usedModels.forEach(({ model, count }) => {
      console.log(`   ${model.padEnd(20)} ${count.toString().padStart(6)}`)
    })

    console.log('\n❌ Unused models (0 records):')
    unusedModels.forEach(({ model }) => {
      console.log(`   ${model}`)
    })

    // Check for null fields in Items
    console.log('\n🔍 Item Model Null Field Analysis:')
    console.log('=' . repeat(50))

    const items = await prisma.item.findMany({
      select: {
        id: true,
        author: true,
        language: true,
        targetModels: true,
        sourceId: true,
        canonicalId: true,
        originalContent: true,
        optimizedContent: true,
        sourceType: true,
        sourceMetadata: true,
        subType: true,
        confidence: true,
      }
    })

    const nullCounts = {
      author: items.filter(i => !i.author).length,
      language: items.filter(i => !i.language).length,
      targetModels: items.filter(i => !i.targetModels).length,
      sourceId: items.filter(i => !i.sourceId).length,
      canonicalId: items.filter(i => !i.canonicalId).length,
      originalContent: items.filter(i => !i.originalContent).length,
      optimizedContent: items.filter(i => !i.optimizedContent).length,
      sourceType: items.filter(i => !i.sourceType).length,
      sourceMetadata: items.filter(i => !i.sourceMetadata || i.sourceMetadata === '{}').length,
      subType: items.filter(i => !i.subType).length,
      confidence: items.filter(i => i.confidence === null).length,
    }

    Object.entries(nullCounts).forEach(([field, nullCount]) => {
      const percentage = ((nullCount / items.length) * 100).toFixed(1)
      const status = nullCount === 0 ? '✅' : nullCount === items.length ? '❌' : '⚠️'
      console.log(`   ${status} ${field.padEnd(18)} ${nullCount.toString().padStart(3)}/${items.length} (${percentage}%) null`)
    })

    // Check tag system inconsistencies
    console.log('\n🏷️  Tag System Analysis:')
    console.log('=' . repeat(50))

    const tagCount = await prisma.tag.count()
    const itemTagCount = await prisma.itemTag.count()
    const categoryCount = await prisma.category.count()
    const itemCategoryCount = await prisma.itemCategory.count()

    console.log(`   Tags: ${tagCount}, ItemTags: ${itemTagCount}`)
    console.log(`   Categories: ${categoryCount}, ItemCategories: ${itemCategoryCount}`)

    // Check if we have duplicate tagging
    if (tagCount > 0 && categoryCount > 0) {
      console.log('   ⚠️  WARNING: Two competing tag systems detected!')

      // Check for overlap
      const tags = await prisma.tag.findMany({ select: { name: true } })
      const categories = await prisma.category.findMany({ select: { name: true } })

      const tagNames = new Set(tags.map(t => t.name))
      const categoryNames = new Set(categories.map(c => c.name))

      const overlap = tags.filter(t => categoryNames.has(t.name))
      console.log(`   📋 Overlapping names: ${overlap.length}`)

      if (overlap.length > 0) {
        console.log('   🔀 Duplicated tag/category names:')
        overlap.slice(0, 5).forEach(tag => console.log(`      - ${tag.name}`))
        if (overlap.length > 5) console.log(`      ... and ${overlap.length - 5} more`)
      }
    }

    // Check import/source tracking
    console.log('\n📥 Import & Source Tracking:')
    console.log('=' . repeat(50))

    const imports = await prisma.import.findMany({
      select: {
        id: true,
        status: true,
        sourceType: true,
        totalFiles: true,
        processedFiles: true,
        failedFiles: true,
      }
    })

    console.log(`   Total imports: ${imports.length}`)
    imports.forEach((imp, i) => {
      console.log(`   Import ${i+1}: ${imp.status} (${imp.sourceType}) - ${imp.processedFiles}/${imp.totalFiles} files`)
    })

    const sources = await prisma.source.findMany({
      select: {
        id: true,
        type: true,
        url: true,
        _count: {
          select: { items: true }
        }
      }
    })

    console.log(`   Total sources: ${sources.length}`)
    sources.forEach((source, i) => {
      console.log(`   Source ${i+1}: ${source.type} (${source._count.items} items) - ${source.url || 'No URL'}`)
    })

    console.log('\n🎯 Recommendations:')
    console.log('=' . repeat(50))

    if (unusedModels.length > 0) {
      console.log('   1. Consider removing unused models from schema:')
      unusedModels.slice(0, 5).forEach(({ model }) => console.log(`      - ${model}`))
    }

    if (tagCount > 0 && categoryCount > 0) {
      console.log('   2. Consolidate tag systems - choose Tag+ItemTag OR Category+ItemCategory')
    }

    if (nullCounts.author === items.length) {
      console.log('   3. Populate missing author fields during import')
    }

    if (nullCounts.sourceType === items.length) {
      console.log('   4. Set sourceType during import (github, local, manual)')
    }

    console.log('\n✅ Database audit completed!')

  } catch (error) {
    console.error('❌ Audit failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the audit
auditDatabase().catch((error) => {
  console.error('❌ Audit script failed:', error)
  process.exit(1)
})