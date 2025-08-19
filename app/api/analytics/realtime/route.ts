import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/analytics/realtime - Get real-time analytics data
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

    const userId = user.id;

    // Get recent activity from database
    const [
      recentItems,
      itemCount,
      collectionCount
    ] = await Promise.all([
      // Recent items
      prisma.item.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          type: true,
          updatedAt: true
        }
      }),
      
      // Total items
      prisma.item.count({
        where: { userId }
      }),
      
      // Total collections
      prisma.collection.count({
        where: { userId }
      })
    ]);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      userId,
      connection: {
        activeConnections: 0, // Placeholder
        connectedUsers: 0,
        userConnected: true
      },
      activeJobs: [],
      recentActivity: recentItems.map(item => ({
        type: 'item_update',
        itemId: item.id,
        itemName: item.name,
        timestamp: item.updatedAt
      })),
      systemMetrics: {
        totalItems: itemCount,
        totalCollections: collectionCount,
        queueSize: 0,
        avgProcessingTime: 0,
        errorRate: 0
      },
      userMetrics: {
        itemsCreated: itemCount,
        collectionsCreated: collectionCount,
        lastActive: recentItems[0]?.updatedAt || new Date()
      },
      alerts: []
    });
  } catch (error) {
    console.error('Realtime analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch realtime analytics' },
      { status: 500 }
    );
  }
}