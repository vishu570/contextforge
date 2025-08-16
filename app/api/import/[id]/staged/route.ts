import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
    const importId = resolvedParams.id;

    // Get the import record
    const importRecord = await prisma.import.findFirst({
      where: {
        id: importId,
        userId: user.id,
      },
    });

    if (!importRecord) {
      return NextResponse.json({ error: 'Import not found' }, { status: 404 });
    }

    // For now, we'll simulate staged items by returning recently created items
    // In a full implementation, you'd have a separate staging table
    const recentItems = await prisma.item.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: importRecord.startedAt,
        },
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        optimizations: {
          where: {
            status: 'suggested',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Convert to staged item format
    const stagedItems = recentItems.map((item) => ({
      id: item.id,
      name: item.name,
      content: item.content,
      type: item.type,
      format: item.format,
      metadata: JSON.parse(item.metadata || '{}'),
      author: item.author,
      language: item.language,
      targetModels: item.targetModels,
      status: 'pending', // All items start as pending for review
      classification: {
        type: item.type,
        confidence: 0.8, // Mock confidence
        reasoning: `Classified as ${item.type} based on content analysis`,
      },
      optimizations: item.optimizations.map((opt) => ({
        targetModel: opt.targetModel,
        optimizedContent: opt.optimizedContent,
        suggestions: JSON.parse(opt.metadata || '{}').suggestions || [],
        confidence: opt.confidence || 0.7,
      })),
    }));

    return NextResponse.json({
      success: true,
      items: stagedItems,
    });
  } catch (error) {
    console.error('Error fetching staged items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staged items' },
      { status: 500 }
    );
  }
}