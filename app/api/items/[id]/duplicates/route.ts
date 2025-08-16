import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current item
    const item = await prisma.item.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Find potential duplicates based on content similarity
    const potentialDuplicates = await prisma.item.findMany({
      where: {
        userId: user.id,
        type: item.type,
        id: { not: id },
        OR: [
          { name: { contains: item.name } },
          { content: { contains: item.content.substring(0, 100) } },
        ],
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      take: 10,
    });

    // Simple content similarity scoring
    const duplicatesWithScore = potentialDuplicates.map((duplicate) => {
      const nameSimilarity = calculateSimilarity(item.name, duplicate.name);
      const contentSimilarity = calculateSimilarity(
        item.content.substring(0, 500),
        duplicate.content.substring(0, 500)
      );
      const overallScore = (nameSimilarity + contentSimilarity) / 2;

      return {
        ...duplicate,
        similarityScore: overallScore,
      };
    }).filter(d => d.similarityScore > 0.3) // Only show items with >30% similarity
      .sort((a, b) => b.similarityScore - a.similarityScore);

    return NextResponse.json(duplicatesWithScore);
  } catch (error) {
    console.error('Error finding duplicates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Simple similarity calculation using Jaccard similarity
function calculateSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}