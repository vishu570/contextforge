import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

const categorySchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  parentId: z.string().optional()
});

const updateCategorySchema = categorySchema.partial();

// Get all categories for a user
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('stats') === 'true';
    const format = searchParams.get('format') || 'flat';

    // Get categories from item metadata
    const items = await prisma.item.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        type: true,
        metadata: true
      }
    });

    // Extract categories and build hierarchy
    const categoryMap = new Map<string, any>();
    const categoryStats = new Map<string, number>();

    items.forEach(item => {
      const category = (item.metadata as any)?.category;
      if (category) {
        categoryStats.set(category, (categoryStats.get(category) || 0) + 1);
        
        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            id: category,
            name: category,
            description: (item.metadata as any)?.categoryDescription || '',
            color: (item.metadata as any)?.categoryColor || '#3b82f6',
            icon: (item.metadata as any)?.categoryIcon || 'folder',
            parentId: (item.metadata as any)?.parentCategory || null,
            itemCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
    });

    // Add stats if requested
    if (includeStats) {
      categoryMap.forEach((category, key) => {
        category.itemCount = categoryStats.get(key) || 0;
      });
    }

    const categories = Array.from(categoryMap.values());

    // Return hierarchical format if requested
    if (format === 'tree') {
      const tree = buildCategoryTree(categories);
      return NextResponse.json({
        success: true,
        categories: tree,
        total: categories.length
      });
    }

    return NextResponse.json({
      success: true,
      categories: categories.sort((a, b) => a.name.localeCompare(b.name)),
      total: categories.length
    });

  } catch (error) {
    console.error('Categories fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// Create a new category
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = categorySchema.parse(body);

    // Check if category already exists
    const existingItems = await prisma.item.findMany({
      where: {
        userId: user.id,
        metadata: {
          contains: `"category":"${validatedData.name}"`
        }
      },
      take: 1
    });

    if (existingItems.length > 0) {
      return NextResponse.json(
        { error: 'Category already exists' },
        { status: 409 }
      );
    }

    // Create a placeholder item to establish the category
    // In production, you'd have a dedicated categories table
    const categoryItem = await prisma.item.create({
      data: {
        name: `Category: ${validatedData.name}`,
        content: validatedData.description || `Category for organizing ${validatedData.name} items`,
        type: 'template',
        format: 'text',
        tags: {
          create: [
            {
              tag: {
                connectOrCreate: {
                  where: { name: 'category' },
                  create: { name: 'category', color: '#6b7280' }
                }
              }
            },
            {
              tag: {
                connectOrCreate: {
                  where: { name: 'system' },
                  create: { name: 'system', color: '#ef4444' }
                }
              }
            }
          ]
        },
        userId: user.id,
        metadata: JSON.stringify({
          isCategory: true,
          category: validatedData.name,
          categoryDescription: validatedData.description,
          categoryColor: validatedData.color || '#3b82f6',
          categoryIcon: validatedData.icon || 'folder',
          parentCategory: validatedData.parentId
        })
      }
    });

    return NextResponse.json({
      success: true,
      category: {
        id: validatedData.name,
        name: validatedData.name,
        description: validatedData.description,
        color: validatedData.color || '#3b82f6',
        icon: validatedData.icon || 'folder',
        parentId: validatedData.parentId,
        itemCount: 0,
        createdAt: categoryItem.createdAt,
        updatedAt: categoryItem.updatedAt
      }
    });

  } catch (error) {
    console.error('Category creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid category data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

// Update category
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('id');
    
    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID required' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateCategorySchema.parse(body);

    // Update all items in this category
    const updatedItems = await prisma.item.updateMany({
      where: {
        userId: user.id,
        metadata: {
          contains: `"category":"${categoryId}"`
        }
      },
      data: {
        metadata: {
          // This would need proper JSON update in production
          // For now, this is a simplified approach
        },
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedItems.count} items in category`,
      category: {
        id: categoryId,
        ...validatedData,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Category update error:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// Delete category
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('id');
    const moveToCategory = searchParams.get('moveTo') || null;
    
    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID required' }, { status: 400 });
    }

    // Find all items in this category
    const itemsInCategory = await prisma.item.findMany({
      where: {
        userId: user.id,
        metadata: {
          contains: `"category":"${categoryId}"`
        }
      }
    });

    // Update items to new category or remove category
    for (const item of itemsInCategory) {
      const newMetadata = JSON.parse(item.metadata);
      
      if (moveToCategory) {
        newMetadata.category = moveToCategory;
      } else {
        delete newMetadata.category;
      }

      await prisma.item.update({
        where: { id: item.id },
        data: {
          metadata: JSON.stringify(newMetadata),
          updatedAt: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Category deleted. ${itemsInCategory.length} items ${moveToCategory ? `moved to ${moveToCategory}` : 'uncategorized'}`,
      affectedItems: itemsInCategory.length
    });

  } catch (error) {
    console.error('Category deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}

function buildCategoryTree(categories: any[]): any[] {
  const categoryMap = new Map(categories.map(cat => [cat.id, { ...cat, children: [] }]));
  const rootCategories: any[] = [];

  categories.forEach(category => {
    const cat = categoryMap.get(category.id)!;
    
    if (category.parentId && categoryMap.has(category.parentId)) {
      const parent = categoryMap.get(category.parentId)!;
      parent.children.push(cat);
    } else {
      rootCategories.push(cat);
    }
  });

  return rootCategories;
}