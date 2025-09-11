import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { z } from 'zod';
import { jobQueue } from '@/lib/queue';
import { JobType, JobPriority } from '@/lib/queue/types';

const CreateJobSchema = z.object({
  type: z.nativeEnum(JobType),
  data: z.record(z.string(), z.any()),
  priority: z.nativeEnum(JobPriority).optional(),
  delay: z.number().optional(),
  retries: z.number().optional(),
  scheduledFor: z.string().optional(),
});

const BatchCreateJobsSchema = z.object({
  jobs: z.array(CreateJobSchema),
});

// GET /api/jobs - Get user's jobs
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    let jobs;
    if (status) {
      jobs = await jobQueue.getJobsByStatus(status as any, limit);
      // Filter by user
      jobs = jobs.filter(job => job.data.userId === user.id);
    } else {
      jobs = await jobQueue.getUserJobs(user.id, limit);
    }

    // Filter by type if specified
    if (type) {
      jobs = jobs.filter(job => job.type === type);
    }

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/jobs - Create a new job
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Check if this is a batch request
    if (body.jobs && Array.isArray(body.jobs)) {
      const validatedData = BatchCreateJobsSchema.parse(body);
      const jobIds: string[] = [];

      for (const jobData of validatedData.jobs) {
        // Ensure userId is set
        jobData.data.userId = user.id;

        const jobId = await jobQueue.addJob(
          jobData.type,
          jobData.data,
          {
            priority: jobData.priority,
            delay: jobData.delay,
            retries: jobData.retries,
            scheduledFor: jobData.scheduledFor ? new Date(jobData.scheduledFor) : undefined,
          }
        );
        jobIds.push(jobId);
      }

      return NextResponse.json({ 
        success: true, 
        jobIds,
        message: `Created ${jobIds.length} jobs` 
      });
    } else {
      // Single job creation
      const validatedData = CreateJobSchema.parse(body);
      
      // Ensure userId is set
      validatedData.data.userId = user.id;

      const jobId = await jobQueue.addJob(
        validatedData.type,
        validatedData.data,
        {
          priority: validatedData.priority,
          delay: validatedData.delay,
          retries: validatedData.retries,
          scheduledFor: validatedData.scheduledFor ? new Date(validatedData.scheduledFor) : undefined,
        }
      );

      return NextResponse.json({ 
        success: true, 
        jobId,
        message: 'Job created successfully' 
      });
    }
  } catch (error) {
    console.error('Error creating job:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}