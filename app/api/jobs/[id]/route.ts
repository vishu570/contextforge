import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { jobQueue } from '@/lib/queue';

// GET /api/jobs/[id] - Get job status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = id;
    const job = await jobQueue.getJobStatus(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check if user owns this job
    if (job.data.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get progress if available
    const progress = await jobQueue.getJobProgress(jobId);

    return NextResponse.json({ 
      job: {
        ...job,
        progress,
      }
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs/[id] - Cancel job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = id;
    const job = await jobQueue.getJobStatus(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check if user owns this job
    if (job.data.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Can only cancel pending or retry jobs
    if (!['pending', 'retry'].includes(job.status)) {
      return NextResponse.json(
        { error: 'Job cannot be cancelled in current status' },
        { status: 400 }
      );
    }

    const cancelled = await jobQueue.cancelJob(jobId);

    if (cancelled) {
      return NextResponse.json({ 
        success: true, 
        message: 'Job cancelled successfully' 
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to cancel job' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error cancelling job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}