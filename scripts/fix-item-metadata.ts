#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function fixItemMetadata() {
  console.log("🔧 Fixing Item model null fields...\n")

  try {
    // Get the source (we know there's 1 GitHub source)
    const source = await prisma.source.findFirst()
    if (!source) {
      console.log("❌ No source found!")
      return
    }

    console.log(`📁 Found source: ${source.type} - ${source.url}`)

    // Get all items with null fields
    const items = await prisma.item.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        metadata: true,
        sourceId: true,
        author: true,
        language: true,
        sourceType: true,
        targetModels: true,
        subType: true,
      },
    })

    console.log(`📝 Processing ${items.length} items...`)

    let updatedCount = 0

    for (const item of items) {
      try {
        // Parse metadata to extract original info
        let metadata: any = {}
        try {
          metadata =
            typeof item.metadata === "string"
              ? JSON.parse(item.metadata)
              : item.metadata || {}
        } catch (e) {
          console.warn(`  ⚠️  Failed to parse metadata for ${item.name}`)
        }

        // Prepare update data
        const updateData: any = {}

        // Link to source if not linked
        if (!item.sourceId) {
          updateData.sourceId = source.id
        }

        // Set author from metadata or default
        if (!item.author) {
          updateData.author = metadata.author || "GitHub Import"
        }

        // Set language from metadata or default
        if (!item.language) {
          updateData.language = metadata.language || "en"
        }

        // Set targetModels based on type - using latest models
        if (!item.targetModels) {
          switch (item.type) {
            case "agent":
              updateData.targetModels = "claude-sonnet-4-0,gpt-5-2025-08-07,gemini-2.5-pro"
              break
            case "prompt":
              updateData.targetModels = "gpt-5-2025-08-07,claude-sonnet-4-0,gemini-2.5-pro"
              break
            default:
              updateData.targetModels = "gpt-5-2025-08-07,claude-sonnet-4-0"
          }
        }

        // Set subType based on analysis
        if (!updateData.subType) {
          if (
            item.name.includes("engineer") ||
            item.name.includes("developer")
          ) {
            updateData.subType = "specialist"
          } else if (
            item.name.includes("manager") ||
            item.name.includes("lead")
          ) {
            updateData.subType = "management"
          } else if (
            item.name.includes("analyst") ||
            item.name.includes("researcher")
          ) {
            updateData.subType = "analytical"
          } else {
            updateData.subType = "general"
          }
        }

        // Only update if we have changes
        if (Object.keys(updateData).length > 0) {
          await prisma.item.update({
            where: { id: item.id },
            data: updateData,
          })
          updatedCount++

          if (updatedCount % 10 === 0) {
            console.log(`  ✅ Updated ${updatedCount}/${items.length} items...`)
          }
        }
      } catch (error) {
        console.error(`  ❌ Failed to update item ${item.name}:`, error)
      }
    }

    console.log(`\n✅ Updated ${updatedCount} items successfully!`)

    // Verify the fixes
    console.log("\n📊 Verification:")
    const nullCounts = (await prisma.$queryRaw`
      SELECT
        SUM(CASE WHEN author IS NULL THEN 1 ELSE 0 END) as null_author,
        SUM(CASE WHEN language IS NULL THEN 1 ELSE 0 END) as null_language,
        SUM(CASE WHEN targetModels IS NULL THEN 1 ELSE 0 END) as null_targetModels,
        SUM(CASE WHEN sourceId IS NULL THEN 1 ELSE 0 END) as null_sourceId,
        SUM(CASE WHEN subType IS NULL THEN 1 ELSE 0 END) as null_subType,
        COUNT(*) as total_items
      FROM Item;
    `) as any[]

    const result = nullCounts[0]
    console.log(`  Author: ${result.null_author}/${result.total_items} null`)
    console.log(
      `  Language: ${result.null_language}/${result.total_items} null`
    )
    console.log(
      `  TargetModels: ${result.null_targetModels}/${result.total_items} null`
    )
    console.log(
      `  SourceId: ${result.null_sourceId}/${result.total_items} null`
    )
    console.log(`  SubType: ${result.null_subType}/${result.total_items} null`)

    console.log("\n✅ Item metadata fix completed!")
  } catch (error) {
    console.error("❌ Metadata fix failed:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixItemMetadata().catch((error) => {
  console.error("❌ Metadata fix script failed:", error)
  process.exit(1)
})
