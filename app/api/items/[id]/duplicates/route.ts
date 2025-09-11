import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Duplicate detection API - Find similar items to prevent duplicates
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const threshold = parseFloat(searchParams.get('threshold') || '0.8');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get the reference item
    const referenceItem = await prisma.item.findFirst({
      where: {
        id: id,
        userId: user.id
      }
    });

    if (!referenceItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Find potential duplicates using simple text similarity
    // In production, this would use proper vector similarity or embeddings
    const allItems = await prisma.item.findMany({
      where: {
        userId: user.id,
        type: referenceItem.type,
        id: { not: id } // Exclude the reference item itself
      },
      select: {
        id: true,
        name: true,
        content: true,
        type: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Simple similarity calculation based on name and content
    const duplicates = allItems
      .map(item => {
        const nameSimilarity = calculateSimilarity(
          referenceItem.name.toLowerCase(),
          item.name.toLowerCase()
        );
        
        const contentSimilarity = calculateSimilarity(
          referenceItem.content.toLowerCase().substring(0, 500),
          item.content.toLowerCase().substring(0, 500)
        );

        const similarity = Math.max(nameSimilarity, contentSimilarity * 0.8);
        
        return {
          ...item,
          similarity,
          reasons: [
            ...(nameSimilarity > threshold ? ['Similar name'] : []),
            ...(contentSimilarity > threshold ? ['Similar content'] : [])
          ]
        };
      })
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      duplicates: duplicates.map(dup => ({
        id: dup.id,
        name: dup.name,
        type: dup.type,
        similarity: Math.round(dup.similarity * 100) / 100,
        reasons: dup.reasons,
        createdAt: dup.createdAt,
        preview: dup.content.substring(0, 150) + (dup.content.length > 150 ? '...' : '')
      })),
      total: duplicates.length,
      threshold,
      referenceItem: {
        id: referenceItem.id,
        name: referenceItem.name,
        type: referenceItem.type
      }
    });

  } catch (error) {
    console.error('Duplicate detection error:', error);
    return NextResponse.json(
      { error: 'Failed to detect duplicates' },
      { status: 500 }
    );
  }
}

// Simple text similarity using Jaccard index
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

// Advanced duplicate detection with content analysis
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { content, title, type } = body;

    // Check for duplicates before saving (useful for import operations)
    const existingItems = await prisma.item.findMany({
      where: {
        userId: user.id,
        type: type,
        id: { not: id }
      }
    });

    const potentialDuplicates = existingItems.filter(item => {
      const nameSim = calculateSimilarity(title.toLowerCase(), item.name.toLowerCase());
      const contentSim = calculateSimilarity(content.toLowerCase(), item.content.toLowerCase());
      return nameSim > 0.9 || contentSim > 0.9;
    });

    return NextResponse.json({
      success: true,
      isDuplicate: potentialDuplicates.length > 0,
      duplicates: potentialDuplicates.map(dup => ({
        id: dup.id,
        name: dup.name,
        similarity: Math.max(
          calculateSimilarity(title.toLowerCase(), dup.name.toLowerCase()),
          calculateSimilarity(content.toLowerCase(), dup.content.toLowerCase())
        ),
        action: 'review_required'
      }))
    });

  } catch (error) {
    console.error('Duplicate analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze for duplicates' },
      { status: 500 }
    );
  }
}