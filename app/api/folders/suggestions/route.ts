import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateFolderSuggestions } from '@/lib/llm/folder-suggestions';

// GET /api/folders/suggestions - Get AI-generated folder suggestions
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get existing suggestions
    const suggestions = await prisma.folderSuggestion.findMany({
      where: { 
        userId: user.id,
        status: 'pending'
      },
      orderBy: [
        { confidence: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error fetching folder suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}

// POST /api/folders/suggestions - Generate new folder suggestions
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemIds, analysisType = 'auto' } = await request.json();

    // Get items to analyze
    let items;
    if (itemIds && itemIds.length > 0) {
      items = await prisma.item.findMany({
        where: {
          id: { in: itemIds },
          userId: user.id
        },
        select: {
          id: true,
          name: true,
          content: true,
          type: true,
          subType: true,
          metadata: true,
          language: true,
          targetModels: true
        }
      });
    } else {
      // Analyze all uncategorized items
      items = await prisma.item.findMany({
        where: {
          userId: user.id,
          collections: {
            none: {}
          }
        },
        select: {
          id: true,
          name: true,
          content: true,
          type: true,
          subType: true,
          metadata: true,
          language: true,
          targetModels: true
        },
        take: 50 // Limit for performance
      });
    }

    if (items.length === 0) {
      return NextResponse.json({ 
        suggestions: [],
        message: 'No items found to analyze'
      });
    }

    // Get existing folder structure for context
    const existingFolders = await prisma.collection.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        path: true,
        level: true,
        description: true
      }
    });

    // Filter out null paths and convert to the expected type
    const validFolders = existingFolders
      .filter(f => f.path !== null)
      .map(f => ({
        id: f.id,
        name: f.name,
        path: f.path as string,
        level: f.level,
        description: f.description
      }));

    // Generate suggestions using AI
    const suggestions = await generateFolderSuggestions(items, validFolders, analysisType);

    // Save suggestions to database
    const savedSuggestions = await Promise.all(
      suggestions.map(suggestion => 
        prisma.folderSuggestion.create({
          data: {
            userId: user.id,
            suggestedPath: suggestion.path,
            rationale: suggestion.rationale,
            confidence: suggestion.confidence,
            itemIds: JSON.stringify(suggestion.itemIds),
            status: 'pending'
          }
        })
      )
    );

    return NextResponse.json({ 
      suggestions: savedSuggestions,
      analyzedItems: items.length
    });
  } catch (error) {
    console.error('Error generating folder suggestions:', error);
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
}

// PATCH /api/folders/suggestions/[id] - Accept or reject a suggestion
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { suggestionIds, action } = await request.json();

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const suggestions = await prisma.folderSuggestion.findMany({
      where: {
        id: { in: suggestionIds },
        userId: user.id,
        status: 'pending'
      }
    });

    if (suggestions.length === 0) {
      return NextResponse.json({ error: 'No valid suggestions found' }, { status: 404 });
    }

    if (action === 'accept') {
      // Apply accepted suggestions
      for (const suggestion of suggestions) {
        await applySuggestion(suggestion, user.id);
        
        await prisma.folderSuggestion.update({
          where: { id: suggestion.id },
          data: {
            status: 'applied',
            appliedAt: new Date()
          }
        });
      }
    } else {
      // Reject suggestions
      await prisma.folderSuggestion.updateMany({
        where: {
          id: { in: suggestionIds },
          userId: user.id
        },
        data: { status: 'rejected' }
      });
    }

    return NextResponse.json({ 
      success: true, 
      action,
      processedSuggestions: suggestions.length 
    });
  } catch (error) {
    console.error('Error processing folder suggestions:', error);
    return NextResponse.json({ error: 'Failed to process suggestions' }, { status: 500 });
  }
}

// Helper function to apply a folder suggestion
async function applySuggestion(suggestion: any, userId: string) {
  const pathParts = suggestion.suggestedPath.split('/').filter(Boolean);
  const itemIds = JSON.parse(suggestion.itemIds);
  
  let currentPath = '';
  let parentId = null;
  
  // Create folder hierarchy if it doesn't exist
  for (let i = 0; i < pathParts.length; i++) {
    const folderName = pathParts[i];
    currentPath += `/${folderName}`;
    
    let folder = await prisma.collection.findFirst({
      where: {
        userId,
        path: currentPath
      }
    });
    
    if (!folder) {
      folder = await prisma.collection.create({
        data: {
          userId,
          name: folderName,
          path: currentPath,
          level: i,
          parentId,
          isFolder: true
        }
      });
    }
    
    parentId = folder.id;
  }
  
  // Add items to the final folder
  if (parentId && itemIds.length > 0) {
    const existingItems = await prisma.itemCollection.findMany({
      where: {
        collectionId: parentId,
        itemId: { in: itemIds }
      }
    });
    
    const existingItemIds = existingItems.map(ic => ic.itemId);
    const newItemIds = itemIds.filter((id: string) => !existingItemIds.includes(id));
    
    if (newItemIds.length > 0) {
      await prisma.itemCollection.createMany({
        data: newItemIds.map((itemId: string, index: number) => ({
          itemId,
          collectionId: parentId,
          position: index
        }))
      });
    }
  }
}