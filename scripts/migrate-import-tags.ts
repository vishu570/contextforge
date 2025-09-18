#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateImportTags() {
  console.log('🏃 Starting tag migration from import metadata...')

  try {
    // Get all items with metadata containing suggested_tags
    const items = await prisma.item.findMany({
      where: {
        NOT: {
          metadata: '{}'
        }
      },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    console.log(`📝 Found ${items.length} items to process`)

    let processedCount = 0
    let tagsCreated = 0
    let tagAssignments = 0

    for (const item of items) {
      try {
        const metadata = JSON.parse(item.metadata)

        // Check if this item has suggested tags from AI classification
        if (metadata.aiClassification?.suggested_tags && Array.isArray(metadata.aiClassification.suggested_tags)) {
          const suggestedTags = metadata.aiClassification.suggested_tags

          console.log(`🏷️  Processing ${suggestedTags.length} tags for item: ${item.name}`)

          for (const tagName of suggestedTags) {
            if (!tagName || typeof tagName !== 'string') continue

            // Create or get the tag
            let tag = await prisma.tag.findUnique({
              where: { name: tagName }
            })

            if (!tag) {
              tag = await prisma.tag.create({
                data: {
                  name: tagName,
                  description: `Auto-generated from GitHub import`
                }
              })
              tagsCreated++
              console.log(`  ✅ Created tag: ${tagName}`)
            }

            // Check if the item-tag relationship already exists
            const existingItemTag = await prisma.itemTag.findUnique({
              where: {
                itemId_tagId: {
                  itemId: item.id,
                  tagId: tag.id
                }
              }
            })

            if (!existingItemTag) {
              await prisma.itemTag.create({
                data: {
                  itemId: item.id,
                  tagId: tag.id
                }
              })
              tagAssignments++
              console.log(`  🔗 Assigned tag "${tagName}" to item "${item.name}"`)
            }
          }

          processedCount++
        }
      } catch (error) {
        console.error(`❌ Error processing item ${item.name}:`, error)
      }
    }

    console.log(`\n✅ Migration completed successfully!`)
    console.log(`📊 Stats:`)
    console.log(`   - Items processed: ${processedCount}`)
    console.log(`   - Tags created: ${tagsCreated}`)
    console.log(`   - Tag assignments: ${tagAssignments}`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
migrateImportTags().catch((error) => {
  console.error('❌ Migration script failed:', error)
  process.exit(1)
})