import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { jobQueue } from '@/lib/queue';
import { getWorkerStats } from '@/lib/queue/workers';

// GET /api/jobs/stats - Get job statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user-specific job stats
    const userJobs = await jobQueue.getUserJobs(session.user.id, 100);
    
    const userStats = {
      total: userJobs.length,
      pending: userJobs.filter(job => job.status === 'pending').length,
      processing: userJobs.filter(job => job.status === 'processing').length,
      completed: userJobs.filter(job => job.status === 'completed').length,
      failed: userJobs.filter(job => job.status === 'failed').length,
      retry: userJobs.filter(job => job.status === 'retry').length,
    };

    const jobsByType = userJobs.reduce((acc, job) => {
      acc[job.type] = (acc[job.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentActivity = userJobs
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)
      .map(job => ({
        id: job.id,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      }));

    // Get system-wide stats (limited for non-admin users)
    const systemStats = await getWorkerStats();
    const queueStats = await jobQueue.getQueueStats();

    return NextResponse.json({
      user: {
        stats: userStats,
        jobsByType,
        recentActivity,
      },
      system: {
        workers: systemStats,
        queues: queueStats,
      },
    });
  } catch (error) {
    console.error('Error fetching job stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}