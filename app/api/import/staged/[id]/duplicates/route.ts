import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Simple similarity scoring function using Jaccard similarity
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

// Enhanced similarity that considers content structure
function calculateContentSimilarity(content1: string, content2: string): number {
  // Normalize content for comparison
  const normalize = (text: string) => text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const norm1 = normalize(content1);
  const norm2 = normalize(content2);
  
  // If either is empty, return 0
  if (!norm1 || !norm2) return 0;
  
  // Calculate word-based similarity
  const wordSimilarity = calculateSimilarity(norm1, norm2);
  
  // Calculate character-based similarity for short texts
  const charSimilarity = calculateSimilarity(
    norm1.replace(/\s/g, ''),
    norm2.replace(/\s/g, '')
  );
  
  // Weighted average favoring word similarity
  return wordSimilarity * 0.7 + charSimilarity * 0.3;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const itemId = resolvedParams.id;

    // Get the target item from staged imports
    const stagingKey = `staged_items_${user.id}`;
    // For now, we'll simulate getting staged items - in production this would come from Redis/cache
    
    // Get existing items from database to compare against
    const existingItems = await prisma.item.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        content: true,
        type: true,
      },
    });

    const duplicates = [];
    const similarityThreshold = 0.3; // 30% similarity threshold

    // For demonstration, let's assume we have access to the staged item
    // In a real implementation, this would come from your staging store
    const mockStagedItem = {
      id: itemId,
      name: "Unity Developer Prompt",
      content: "You are a Unity developer assistant...",
      type: "agent"
    };

    // Find potential duplicates
    for (const existing of existingItems) {
      const nameSimilarity = calculateSimilarity(mockStagedItem.name, existing.name);
      const contentSimilarity = calculateContentSimilarity(mockStagedItem.content, existing.content);
      
      // Use the higher of name or content similarity
      const overallSimilarity = Math.max(nameSimilarity, contentSimilarity);
      
      if (overallSimilarity > similarityThreshold) {
        duplicates.push({
          id: existing.id,
          name: existing.name,
          type: existing.type,
          similarity: overallSimilarity,
        });
      }
    }

    // Sort by similarity score (highest first)
    duplicates.sort((a, b) => b.similarity - a.similarity);

    return NextResponse.json({
      success: true,
      duplicates: duplicates.slice(0, 10), // Limit to top 10 matches
    });
  } catch (error) {
    console.error('Error finding duplicates:', error);
    return NextResponse.json(
      { error: 'Failed to find duplicates' },
      { status: 500 }
    );
  }
}