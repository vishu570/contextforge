#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function comprehensiveTagCleanup() {
  console.log('🧹 Starting comprehensive tag cleanup...')

  try {
    // Get all items with their tags
    const items = await prisma.item.findMany({
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    console.log(`📋 Found ${items.length} items`)

    let updatedCount = 0
    const tagsToRemove = new Set()

    for (const item of items) {
      const currentTags = item.tags.map(itemTag => itemTag.tag.name)

      if (currentTags.length === 0) continue

      // Define tags to remove (redundant, useless, or organizational artifacts)
      const cleanedTags = currentTags.filter(tagName => {
        const lowerTag = tagName.toLowerCase()

        // Remove these redundant/useless tags
        const shouldRemove = (
          // Organizational artifacts from old system
          lowerTag === 'categories' ||
          lowerTag === 'category' ||
          lowerTag.includes('01-core-development') ||
          lowerTag.includes('02-infrastructure') ||
          lowerTag.includes('02-language-specialists') ||
          lowerTag.includes('03-testing') ||
          lowerTag.includes('03-infrastructure') ||
          lowerTag.includes('04-frontend') ||
          lowerTag.includes('04-quality-security') ||
          lowerTag.includes('05-data') ||
          lowerTag.includes('05-data-ai') ||
          lowerTag.includes('06-developer') ||
          lowerTag.includes('06-developer-experience') ||
          lowerTag.includes('07-specialized') ||
          lowerTag.includes('07-specialized-domains') ||
          lowerTag.includes('08-business') ||
          lowerTag.includes('08-business-product') ||
          lowerTag.includes('09-meta') ||
          lowerTag.includes('09-meta-orchestration') ||
          lowerTag.includes('10-research') ||
          lowerTag.includes('10-research-analysis') ||
          lowerTag.startsWith('categories/') ||
          lowerTag.match(/^\d+-/) || // Remove numbered prefixes like "01-", "02-", etc.

          // Redundant tags (already organized by type)
          lowerTag === 'ai-agent' || // Redundant since items are already categorized as "agent"

          // Overly generic/useless tags that appear on most items
          lowerTag === 'workflow-automation' || // Almost every item has this
          lowerTag === 'prompt-template' // Almost every item has this and it's not specific
        )

        if (shouldRemove) {
          tagsToRemove.add(tagName)
        }

        return !shouldRemove
      })

      // Only update if tags actually changed
      if (cleanedTags.length !== currentTags.length) {
        // Remove all existing tags for this item
        await prisma.itemTag.deleteMany({
          where: { itemId: item.id }
        })

        // Add back only the cleaned tags
        for (const tagName of cleanedTags) {
          // Find or create the tag
          let tag = await prisma.tag.findUnique({
            where: { name: tagName }
          })

          if (!tag) {
            tag = await prisma.tag.create({
              data: { name: tagName }
            })
          }

          // Create the item-tag relationship
          await prisma.itemTag.create({
            data: {
              itemId: item.id,
              tagId: tag.id
            }
          })
        }

        console.log(`✅ Updated "${item.name}": ${currentTags.length} -> ${cleanedTags.length} tags`)
        console.log(`   Removed: ${currentTags.filter(t => !cleanedTags.includes(t)).join(', ')}`)

        updatedCount++
      }
    }

    // Clean up orphaned tags (tags that are no longer used by any items)
    console.log('\n🗑️  Cleaning up orphaned tags...')

    const orphanedTags = await prisma.tag.findMany({
      where: {
        items: {
          none: {}
        }
      }
    })

    if (orphanedTags.length > 0) {
      await prisma.tag.deleteMany({
        where: {
          id: {
            in: orphanedTags.map(tag => tag.id)
          }
        }
      })
      console.log(`🗑️  Removed ${orphanedTags.length} orphaned tags: ${orphanedTags.map(t => t.name).join(', ')}`)
    }

    console.log(`\n🎉 Comprehensive tag cleanup completed!`)
    console.log(`📊 Summary:`)
    console.log(`   - Updated ${updatedCount} items`)
    console.log(`   - Removed tags: ${Array.from(tagsToRemove).join(', ')}`)
    console.log(`   - Cleaned up ${orphanedTags.length} orphaned tags`)

    // Show remaining tag summary
    const remainingTags = await prisma.tag.findMany({
      include: {
        _count: {
          select: { items: true }
        }
      },
      orderBy: {
        items: {
          _count: 'desc'
        }
      }
    })

    console.log(`\n📈 Remaining tags (${remainingTags.length} total):`)
    remainingTags.slice(0, 20).forEach(tag => {
      console.log(`   - ${tag.name} (${tag._count.items} items)`)
    })

  } catch (error) {
    console.error('❌ Error during comprehensive tag cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup
if (require.main === module) {
  comprehensiveTagCleanup().catch((error) => {
    console.error('Failed to run comprehensive tag cleanup:', error)
    process.exit(1)
  })
}

export { comprehensiveTagCleanup }