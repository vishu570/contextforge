import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { optimizationPipeline } from '@/lib/pipeline/optimization-pipeline';

// GET /api/pipeline/status - Get pipeline status for user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await optimizationPipeline.getPipelineStatus(user.id);

    return NextResponse.json({
      success: true,
      status,
      config: optimizationPipeline.getConfig(),
    });
  } catch (error) {
    console.error('Error fetching pipeline status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/pipeline/status - Update pipeline configuration
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Update pipeline configuration
    optimizationPipeline.updateConfig(body);

    return NextResponse.json({
      success: true,
      message: 'Pipeline configuration updated',
      config: optimizationPipeline.getConfig(),
    });
  } catch (error) {
    console.error('Error updating pipeline config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}