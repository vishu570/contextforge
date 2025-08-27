import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

// Get import job status and progress
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const jobsDir = path.join(process.cwd(), 'uploads', 'jobs');
    const jobFile = path.join(jobsDir, `${id}.json`);

    try {
      const jobData = JSON.parse(await fs.readFile(jobFile, 'utf-8'));
      
      // Verify job belongs to user
      if (jobData.userId !== user.id) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        job: {
          id: jobData.id,
          fileName: jobData.fileName,
          format: jobData.format,
          status: jobData.status,
          progress: jobData.progress,
          totalItems: jobData.totalItems,
          validItems: jobData.validItems,
          errorItems: jobData.errorItems,
          duplicates: jobData.duplicates,
          createdAt: jobData.createdAt,
          completedAt: jobData.completedAt,
          message: getStatusMessage(jobData.status, jobData.progress)
        }
      });

    } catch (fileError) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

  } catch (error) {
    console.error('Import status error:', error);
    return NextResponse.json(
      { error: 'Failed to get import status' },
      { status: 500 }
    );
  }
}

function getStatusMessage(status: string, progress: number): string {
  switch (status) {
    case 'pending':
      return 'Import job queued for processing';
    case 'processing':
      return `Processing import... ${progress}% complete`;
    case 'completed':
      return 'Import completed successfully';
    case 'failed':
      return 'Import failed';
    default:
      return 'Unknown status';
  }
}