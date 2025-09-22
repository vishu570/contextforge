#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface CategoryMapping {
  oldPattern: RegExp
  newName: string
  description: string
  icon: string
  color: string
}

// Mapping from old category patterns to new proper category names
const categoryMappings: CategoryMapping[] = [
  {
    oldPattern: /categories?\/?0?1?-?core-?development/i,
    newName: 'Agents',
    description: 'AI agents and assistants for development tasks',
    icon: 'user',
    color: '#3b82f6'
  },
  {
    oldPattern: /categories?\/?0?2?-?prompt/i,
    newName: 'Prompts',
    description: 'Prompt templates and instructions',
    icon: 'message-square',
    color: '#10b981'
  },
  {
    oldPattern: /categories?\/?0?3?-?rule/i,
    newName: 'Rules',
    description: 'Development rules and guidelines',
    icon: 'shield',
    color: '#f59e0b'
  },
  {
    oldPattern: /categories?\/?0?4?-?hook/i,
    newName: 'Hooks',
    description: 'Lifecycle hooks and triggers',
    icon: 'git-branch',
    color: '#8b5cf6'
  },
  {
    oldPattern: /categories?\/?0?5?-?command/i,
    newName: 'Commands',
    description: 'Scripts and command-line tools',
    icon: 'terminal',
    color: '#ef4444'
  },
  {
    oldPattern: /categories?\/?0?6?-?template/i,
    newName: 'Templates',
    description: 'Code templates and boilerplates',
    icon: 'file-template',
    color: '#ec4899'
  },
  {
    oldPattern: /categories?\/?0?7?-?config/i,
    newName: 'Configurations',
    description: 'Configuration files and settings',
    icon: 'settings',
    color: '#6366f1'
  }
]

// Keywords to detect item types from content
const itemTypeKeywords = {
  agent: [
    'agent', 'assistant', 'bot', 'persona', 'character', 'role',
    'backend-developer', 'api-designer', 'fullstack-developer',
    'electron-pro', 'frontend-developer', 'system role'
  ],
  prompt: [
    'prompt', 'instruction', 'system prompt', 'user prompt',
    'template prompt', 'ask', 'query'
  ],
  rule: [
    'rule', 'guideline', 'principle', 'convention', 'standard',
    'policy', 'constraint', 'requirement', 'specification'
  ],
  hook: [
    'hook', 'webhook', 'pre-commit', 'post-commit', 'lifecycle',
    'event handler', 'trigger', 'callback'
  ],
  command: [
    'command', 'script', 'bash', 'shell', 'cli', 'terminal', 'executable'
  ],
  template: [
    'template', 'boilerplate', 'starter', 'scaffold', 'skeleton'
  ]
}

async function detectItemType(item: any): Promise<string> {
  const content = (item.content || '').toLowerCase()
  const name = (item.name || '').toLowerCase()

  // Check content and name for keywords
  for (const [type, keywords] of Object.entries(itemTypeKeywords)) {
    if (keywords.some(keyword =>
      content.includes(keyword) || name.includes(keyword)
    )) {
      return type
    }
  }

  // Check file extension or existing type
  if (item.format === '.md' && content.includes('prompt')) return 'prompt'
  if (item.format === '.sh' || item.format === '.bat') return 'command'
  if (item.type === 'agent') return 'agent'
  if (item.type === 'prompt') return 'prompt'
  if (item.type === 'rule') return 'rule'
  if (item.type === 'template') return 'template'

  return 'other'
}

async function fixCategorization() {
  console.log('🔄 Starting categorization fix...')

  try {
    // 1. Get all users
    const users = await prisma.user.findMany()
    console.log(`👥 Found ${users.length} users`)

    for (const user of users) {
      console.log(`\n👤 Processing user: ${user.email}`)

      // 2. Get all categories for this user
      const categories = await prisma.category.findMany({
        where: { userId: user.id },
        include: {
          items: {
            include: {
              item: true
            }
          }
        }
      })

      console.log(`📁 Found ${categories.length} categories`)

      // 3. Create a map of new categories to ensure we don't create duplicates
      const newCategoryMap = new Map<string, string>()

      // 4. Process each old category
      for (const category of categories) {
        console.log(`  📋 Processing category: "${category.name}"`)

        // Find matching mapping
        const mapping = categoryMappings.find(m => m.oldPattern.test(category.name))

        if (mapping) {
          console.log(`    ➡️  Maps to: "${mapping.newName}"`)

          // Find or create the new category
          let newCategory = await prisma.category.findFirst({
            where: {
              name: mapping.newName,
              userId: user.id
            }
          })

          if (!newCategory) {
            newCategory = await prisma.category.create({
              data: {
                name: mapping.newName,
                description: mapping.description,
                icon: mapping.icon,
                color: mapping.color,
                userId: user.id
              }
            })
            console.log(`    ✅ Created new category: "${mapping.newName}"`)
          } else {
            console.log(`    ♻️  Using existing category: "${mapping.newName}"`)
          }

          newCategoryMap.set(category.id, newCategory.id)

          // Move all items to the new category
          if (category.items.length > 0) {
            await prisma.itemCategory.updateMany({
              where: { categoryId: category.id },
              data: { categoryId: newCategory.id }
            })
            console.log(`    📦 Moved ${category.items.length} items`)
          }

          // Delete the old category
          await prisma.category.delete({
            where: { id: category.id }
          })
          console.log(`    🗑️  Deleted old category`)
        } else {
          console.log(`    ⏭️  No mapping found, keeping as is`)
        }
      }

      // 5. Re-categorize items that don't have proper categories
      const uncategorizedItems = await prisma.item.findMany({
        where: {
          userId: user.id,
          itemCategories: {
            none: {}
          }
        }
      })

      console.log(`📦 Found ${uncategorizedItems.length} uncategorized items`)

      for (const item of uncategorizedItems) {
        const detectedType = await detectItemType(item)

        // Map item type to category name
        const categoryName = {
          agent: 'Agents',
          prompt: 'Prompts',
          rule: 'Rules',
          hook: 'Rules', // Hooks are categorized as Rules
          command: 'Commands',
          template: 'Templates',
          other: 'Other'
        }[detectedType] || 'Other'

        // Find or create the category
        let category = await prisma.category.findFirst({
          where: {
            name: categoryName,
            userId: user.id
          }
        })

        if (!category) {
          const mapping = categoryMappings.find(m => m.newName === categoryName)
          category = await prisma.category.create({
            data: {
              name: categoryName,
              description: mapping?.description || `${categoryName} category`,
              icon: mapping?.icon || 'folder',
              color: mapping?.color || '#6b7280',
              userId: user.id
            }
          })
          console.log(`    ✅ Created category: "${categoryName}"`)
        }

        // Add item to category
        await prisma.itemCategory.create({
          data: {
            userId: user.id,
            itemId: item.id,
            categoryId: category.id,
            confidence: 0.8,
            source: 'system_migrated',
            isApproved: false
          }
        })

        console.log(`    📝 Categorized "${item.name}" as ${categoryName}`)
      }
    }

    console.log('\n✅ Categorization fix completed successfully!')

  } catch (error) {
    console.error('❌ Error fixing categorization:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
if (require.main === module) {
  fixCategorization().catch((error) => {
    console.error('Failed to fix categorization:', error)
    process.exit(1)
  })
}

export { fixCategorization }