import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';

import SemanticClusteringService from '@/lib/semantic/clustering';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      algorithm = 'kmeans',
      numClusters,
      threshold = 0.7,
      maxIterations = 100,
      minPoints = 3,
      distance = 'cosine',
    } = body;

    const clusteringService = new SemanticClusteringService(session.user.id);
    
    const analysis = await clusteringService.clusterItems(session.user.id, {
      algorithm,
      numClusters,
      threshold,
      maxIterations,
      minPoints,
      distance,
    });

    return NextResponse.json({
      success: true,
      analysis: {
        clusters: analysis.clusters.map(cluster => ({
          id: cluster.id,
          name: cluster.name,
          description: cluster.description,
          algorithm: cluster.algorithm,
          threshold: cluster.threshold,
          itemCount: cluster.items.length,
          items: cluster.items.slice(0, 10), // Limit items in response
        })),
        summary: analysis.summary,
        silhouetteScore: analysis.silhouetteScore,
        inertia: analysis.inertia,
        outliers: analysis.outliers,
      },
    });
  } catch (error) {
    console.error('Error performing clustering:', error);
    return NextResponse.json(
      { error: 'Failed to perform clustering analysis' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clusteringService = new SemanticClusteringService(session.user.id);
    const clusters = await clusteringService.getUserClusters(session.user.id);

    return NextResponse.json({
      clusters: clusters.map(cluster => ({
        id: cluster.id,
        name: cluster.name,
        description: cluster.description,
        algorithm: cluster.algorithm,
        threshold: cluster.threshold,
        itemCount: cluster.items.length,
        createdAt: new Date(), // Placeholder
      })),
    });
  } catch (error) {
    console.error('Error retrieving clusters:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve clusters' },
      { status: 500 }
    );
  }
}