#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanTags() {
  console.log('🧹 Starting tag cleanup...')

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

    for (const item of items) {
      const currentTags = item.tags.map(itemTag => itemTag.tag.name)

      if (currentTags.length === 0) continue

      // Remove unwanted tags
      const originalLength = currentTags.length
      const cleanedTags = currentTags.filter(tagName => {
        const lowerTag = tagName.toLowerCase()

        // Remove these unwanted tags
        return !(
          lowerTag === 'categories' ||
          lowerTag === 'category' ||
          lowerTag.includes('01-core-development') ||
          lowerTag.includes('02-infrastructure') ||
          lowerTag.includes('03-testing') ||
          lowerTag.includes('04-frontend') ||
          lowerTag.includes('05-data') ||
          lowerTag.includes('06-developer') ||
          lowerTag.includes('07-specialized') ||
          lowerTag.includes('08-business') ||
          lowerTag.includes('09-meta') ||
          lowerTag.includes('10-research') ||
          lowerTag.startsWith('categories/') ||
          lowerTag.match(/^\d+-/) // Remove numbered prefixes like "01-", "02-", etc.
        )
      })

      // Add semantic tags based on item type and content
      const semanticTags = getSemanticTags(item, currentTags)
      const finalTags = [...new Set([...cleanedTags, ...semanticTags])] // Remove duplicates

      // Update if tags changed
      if (originalLength !== finalTags.length || JSON.stringify(currentTags.sort()) !== JSON.stringify(finalTags.sort())) {
        // Remove all existing tags for this item
        await prisma.itemTag.deleteMany({
          where: { itemId: item.id }
        })

        // Add new tags
        for (const tagName of finalTags) {
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

        console.log(`✅ Updated "${item.name}": ${originalLength} -> ${finalTags.length} tags`)
        console.log(`   Removed: ${currentTags.filter(t => !finalTags.includes(t)).join(', ')}`)
        console.log(`   Added: ${finalTags.filter(t => !currentTags.includes(t)).join(', ')}`)

        updatedCount++
      }
    }

    console.log(`\n🎉 Tag cleanup completed! Updated ${updatedCount} items`)

  } catch (error) {
    console.error('❌ Error cleaning tags:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

function getSemanticTags(item: { name: string; type: string }, currentTags: string[]): string[] {
  const tags: string[] = []
  const name = item.name.toLowerCase()
  const type = item.type

  // Add type-based tags
  switch (type) {
    case 'agent':
      tags.push('ai-agent')
      break
    case 'prompt':
      tags.push('prompt-template')
      break
    case 'rule':
      tags.push('development-rule')
      break
    case 'template':
      tags.push('code-template')
      break
    case 'snippet':
      tags.push('code-snippet')
      break
  }

  // Add role-based tags for agents
  if (type === 'agent') {
    if (name.includes('backend') || name.includes('api')) {
      tags.push('backend', 'api-development')
    }
    if (name.includes('frontend') || name.includes('ui') || name.includes('react') || name.includes('vue') || name.includes('angular')) {
      tags.push('frontend', 'ui-development')
    }
    if (name.includes('fullstack') || name.includes('full-stack')) {
      tags.push('fullstack', 'web-development')
    }
    if (name.includes('mobile') || name.includes('ios') || name.includes('android') || name.includes('flutter')) {
      tags.push('mobile-development')
    }
    if (name.includes('devops') || name.includes('deployment') || name.includes('infrastructure')) {
      tags.push('devops', 'infrastructure')
    }
    if (name.includes('data') || name.includes('ml') || name.includes('ai') || name.includes('machine-learning')) {
      tags.push('data-science', 'machine-learning')
    }
    if (name.includes('test') || name.includes('qa') || name.includes('quality')) {
      tags.push('testing', 'quality-assurance')
    }
    if (name.includes('security') || name.includes('audit') || name.includes('penetration')) {
      tags.push('security', 'cybersecurity')
    }
    if (name.includes('project') || name.includes('product') || name.includes('manager')) {
      tags.push('project-management')
    }
  }

  // Add workflow automation tag if present
  if (currentTags.includes('workflow-automation')) {
    tags.push('workflow-automation')
  }
  if (currentTags.includes('prompt-template')) {
    tags.push('prompt-template')
  }

  return tags
}

// Run the cleanup
if (require.main === module) {
  cleanTags().catch((error) => {
    console.error('Failed to clean tags:', error)
    process.exit(1)
  })
}

export { cleanTags }