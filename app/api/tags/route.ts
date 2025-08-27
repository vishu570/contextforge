import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

const tagSchema = z.object({
  name: z.string().min(1).max(30),
  description: z.string().optional(),
  color: z.string().optional()
});

const bulkTagSchema = z.object({
  itemIds: z.array(z.string()),
  tags: z.array(z.string()),
  action: z.enum(['add', 'remove', 'replace']).default('add')
});

// Get all tags for a user with usage statistics
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const sort = searchParams.get('sort') || 'usage'; // usage, name, created

    // Get all items to analyze tags
    const items = await prisma.item.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        tags: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Build tag statistics
    const tagMap = new Map<string, {
      name: string;
      count: number;
      recentUsage: Date;
      items: string[];
    }>();

    items.forEach(item => {
      item.tags?.forEach(tag => {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, {
            name: tag,
            count: 0,
            recentUsage: item.updatedAt,
            items: []
          });
        }
        
        const tagData = tagMap.get(tag)!;
        tagData.count++;
        tagData.items.push(item.id);
        
        // Update recent usage
        if (item.updatedAt > tagData.recentUsage) {
          tagData.recentUsage = item.updatedAt;
        }
      });
    });

    // Convert to array and filter by query
    let tags = Array.from(tagMap.values());
    
    if (query) {
      tags = tags.filter(tag => 
        tag.name.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Sort tags
    switch (sort) {
      case 'name':
        tags.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'created':
        tags.sort((a, b) => b.recentUsage.getTime() - a.recentUsage.getTime());
        break;
      case 'usage':
      default:
        tags.sort((a, b) => b.count - a.count);
        break;
    }

    // Limit results
    tags = tags.slice(0, limit);

    // Prepare response
    const responseTags = tags.map(tag => ({
      name: tag.name,
      count: tag.count,
      recentUsage: tag.recentUsage.toISOString(),
      color: getTagColor(tag.name), // Generate consistent color
      description: '', // Could be stored in metadata
    }));

    return NextResponse.json({
      success: true,
      tags: responseTags,
      total: tagMap.size,
      filtered: responseTags.length
    });

  } catch (error) {
    console.error('Tags fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

// Bulk tag operations
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = bulkTagSchema.parse(body);

    // Verify all items belong to user
    const items = await prisma.item.findMany({
      where: {
        id: { in: validatedData.itemIds },
        userId: user.id
      }
    });

    if (items.length !== validatedData.itemIds.length) {
      return NextResponse.json(
        { error: 'Some items not found or not owned by user' },
        { status: 404 }
      );
    }

    // Process each item based on action
    const updatePromises = items.map(async (item) => {
      let newTags: string[] = [];

      switch (validatedData.action) {
        case 'add':
          // Add new tags, avoid duplicates
          newTags = [...new Set([...(item.tags || []), ...validatedData.tags])];
          break;
        case 'remove':
          // Remove specified tags
          newTags = (item.tags || []).filter(tag => !validatedData.tags.includes(tag));
          break;
        case 'replace':
          // Replace all tags
          newTags = validatedData.tags;
          break;
      }

      return prisma.item.update({
        where: { id: item.id },
        data: {
          tags: newTags,
          updatedAt: new Date()
        }
      });
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: `${validatedData.action === 'add' ? 'Added' : validatedData.action === 'remove' ? 'Removed' : 'Replaced'} tags for ${items.length} items`,
      affectedItems: items.length,
      tags: validatedData.tags
    });

  } catch (error) {
    console.error('Bulk tag operation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid tag operation data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to perform tag operation' },
      { status: 500 }
    );
  }
}

// Rename a tag across all items
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { oldTag, newTag } = body;

    if (!oldTag || !newTag) {
      return NextResponse.json(
        { error: 'Both oldTag and newTag are required' },
        { status: 400 }
      );
    }

    // Find all items with the old tag
    const items = await prisma.item.findMany({
      where: {
        userId: user.id,
        tags: { has: oldTag }
      }
    });

    // Update each item
    const updatePromises = items.map(async (item) => {
      const newTags = item.tags?.map(tag => tag === oldTag ? newTag : tag) || [];
      
      return prisma.item.update({
        where: { id: item.id },
        data: {
          tags: newTags,
          updatedAt: new Date()
        }
      });
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: `Renamed tag '${oldTag}' to '${newTag}' in ${items.length} items`,
      affectedItems: items.length,
      oldTag,
      newTag
    });

  } catch (error) {
    console.error('Tag rename error:', error);
    return NextResponse.json(
      { error: 'Failed to rename tag' },
      { status: 500 }
    );
  }
}

// Delete a tag from all items
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tagToDelete = searchParams.get('tag');

    if (!tagToDelete) {
      return NextResponse.json(
        { error: 'Tag parameter required' },
        { status: 400 }
      );
    }

    // Find all items with this tag
    const items = await prisma.item.findMany({
      where: {
        userId: user.id,
        tags: { has: tagToDelete }
      }
    });

    // Remove tag from each item
    const updatePromises = items.map(async (item) => {
      const newTags = item.tags?.filter(tag => tag !== tagToDelete) || [];
      
      return prisma.item.update({
        where: { id: item.id },
        data: {
          tags: newTags,
          updatedAt: new Date()
        }
      });
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: `Deleted tag '${tagToDelete}' from ${items.length} items`,
      affectedItems: items.length,
      deletedTag: tagToDelete
    });

  } catch (error) {
    console.error('Tag deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}

// Generate consistent colors for tags
function getTagColor(tagName: string): string {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e'
  ];
  
  // Simple hash function to get consistent color
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}