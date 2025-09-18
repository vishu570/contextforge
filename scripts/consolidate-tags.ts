#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function consolidateTags() {
  console.log('🔄 Consolidating duplicate tag systems...\n')

  try {
    // Get current counts
    const tagCount = await prisma.tag.count()
    const itemTagCount = await prisma.itemTag.count()
    const categoryCount = await prisma.category.count()
    const itemCategoryCount = await prisma.itemCategory.count()

    console.log(`Current state:`)
    console.log(`  Tags: ${tagCount}, ItemTags: ${itemTagCount}`)
    console.log(`  Categories: ${categoryCount}, ItemCategories: ${itemCategoryCount}`)

    if (itemTagCount > 0 && itemCategoryCount > 0) {
      console.log('\n✅ Both systems have data. Tag+ItemTag system appears to be working.')
      console.log('🗑️  Removing redundant Category+ItemCategory system...')

      // Delete ItemCategory relationships first (foreign key constraints)
      const deletedItemCategories = await prisma.itemCategory.deleteMany({})
      console.log(`   Deleted ${deletedItemCategories.count} ItemCategory relationships`)

      // Delete Categories
      const deletedCategories = await prisma.category.deleteMany({})
      console.log(`   Deleted ${deletedCategories.count} Categories`)

      console.log('\n✅ Category system removed. Tag+ItemTag system is now the single source of truth.')

    } else if (itemCategoryCount > 0 && itemTagCount === 0) {
      console.log('\n⚠️  Only Category system has data. Converting to Tag+ItemTag system...')

      // This shouldn't happen based on audit, but handle it
      console.log('   This case needs manual review - stopping.')
      return
    }

    // Verify final state
    const finalTagCount = await prisma.tag.count()
    const finalItemTagCount = await prisma.itemTag.count()
    const finalCategoryCount = await prisma.category.count()
    const finalItemCategoryCount = await prisma.itemCategory.count()

    console.log(`\nFinal state:`)
    console.log(`  Tags: ${finalTagCount}, ItemTags: ${finalItemTagCount}`)
    console.log(`  Categories: ${finalCategoryCount}, ItemCategories: ${finalItemCategoryCount}`)

    console.log('\n✅ Tag system consolidation completed!')

  } catch (error) {
    console.error('❌ Consolidation failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the consolidation
consolidateTags().catch((error) => {
  console.error('❌ Consolidation script failed:', error)
  process.exit(1)
})