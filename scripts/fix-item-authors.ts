#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixItemAuthors() {
  try {
    console.log('🔍 Finding items with "Unknown User" authors...');

    // Get all users first
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true }
    });

    if (users.length === 0) {
      console.log('❌ No users found in the database');
      return;
    }

    let totalUpdated = 0;

    // For each user, update their items that have "Unknown User" as author
    for (const user of users) {
      console.log(`\n👤 Processing user: ${user.name || user.email} (${user.id})`);

      // Find items where metadata contains "Unknown User" as author
      const items = await prisma.item.findMany({
        where: {
          userId: user.id,
          metadata: {
            contains: 'Unknown User'
          }
        }
      });

      console.log(`   📦 Found ${items.length} items with "Unknown User" author`);

      if (items.length === 0) continue;

      // Update each item's metadata
      for (const item of items) {
        try {
          let metadata = item.metadata;

          // Parse metadata if it's a string
          if (typeof metadata === 'string') {
            try {
              metadata = JSON.parse(metadata);
            } catch (e) {
              metadata = {};
            }
          }

          // Ensure metadata is an object
          if (!metadata || typeof metadata !== 'object') {
            metadata = {};
          }

          // Update the author field
          const updatedMetadata = {
            ...metadata,
            author: user.name || user.email
          };

          // Update the item
          await prisma.item.update({
            where: { id: item.id },
            data: {
              metadata: updatedMetadata
            }
          });

          console.log(`   ✅ Updated item: ${item.name}`);
          totalUpdated++;

        } catch (error) {
          console.error(`   ❌ Failed to update item ${item.name}:`, error);
        }
      }
    }

    console.log(`\n🎉 Migration completed! Updated ${totalUpdated} items total.`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
fixItemAuthors();