#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addSourceTracking() {
  console.log('🔗 Adding source tracking to imported items...')

  try {
    // Find all items that were imported from GitHub but don't have proper source tracking
    const items = await prisma.item.findMany({
      where: {
        sourceType: 'github'
      }
    })

    console.log(`📋 Found ${items.length} GitHub-imported items`)

    let updatedCount = 0

    for (const item of items) {
      let metadata: any = {}

      try {
        metadata = typeof item.sourceMetadata === 'string'
          ? JSON.parse(item.sourceMetadata)
          : item.sourceMetadata || {}
      } catch (error) {
        console.warn(`⚠️  Could not parse metadata for item ${item.name}`)
        metadata = {}
      }

      // Extract source information from metadata
      let sourceRepo = ''
      let sourcePath = ''
      let sourceCommit = ''
      let originalUrl = ''

      // Try to extract from existing metadata
      if (metadata.repoUrl) {
        sourceRepo = metadata.repoUrl
      }
      if (metadata.path) {
        sourcePath = metadata.path
      }
      if (metadata.sha) {
        sourceCommit = metadata.sha
      }
      if (metadata.url) {
        originalUrl = metadata.url
      }

      // Enhance metadata with source tracking information
      const enhancedMetadata = {
        ...metadata,
        sourceTracking: {
          repository: sourceRepo,
          path: sourcePath,
          commit: sourceCommit,
          originalUrl: originalUrl,
          importedAt: metadata.processed || item.createdAt.toISOString(),
          lastChecked: null,
          hasUpdates: false,
          updateAvailable: false
        }
      }

      // Update the item with enhanced metadata
      await prisma.item.update({
        where: { id: item.id },
        data: {
          sourceMetadata: JSON.stringify(enhancedMetadata)
        }
      })

      console.log(`✅ Added source tracking to "${item.name}"`)
      console.log(`   Repository: ${sourceRepo}`)
      console.log(`   Path: ${sourcePath}`)

      updatedCount++
    }

    console.log(`\n🎉 Source tracking added to ${updatedCount} items!`)

  } catch (error) {
    console.error('❌ Error adding source tracking:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
if (require.main === module) {
  addSourceTracking().catch((error) => {
    console.error('Failed to add source tracking:', error)
    process.exit(1)
  })
}

export { addSourceTracking }