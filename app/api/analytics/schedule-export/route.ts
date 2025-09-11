import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';

import { prisma } from '@/lib/db';

// POST /api/analytics/schedule-export - Schedule automated export
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { config, userId } = body;

    // Create scheduled export record
    const scheduledExport = await prisma.scheduledExport.create({
      data: {
        userId: user.id,
        name: config.customTitle || `${config.reportType} Report`,
        format: config.format,
        reportType: config.reportType,
        timeRange: config.timeRange,
        sections: JSON.stringify(config.sections),
        includeCharts: config.includeCharts,
        includeRawData: config.includeRawData,
        recipients: JSON.stringify(config.recipients),
        frequency: 'weekly', // Default frequency
        scheduledTime: '09:00',
        isActive: true,
        nextExecution: calculateNextExecution('weekly', '09:00'),
        customTitle: config.customTitle,
        customDescription: config.customDescription
      }
    });

    return NextResponse.json({
      success: true,
      scheduledExportId: scheduledExport.id,
      message: 'Export scheduled successfully'
    });
  } catch (error) {
    console.error('Schedule export error:', error);
    return NextResponse.json(
      { error: 'Failed to schedule export' },
      { status: 500 }
    );
  }
}

// GET /api/analytics/schedule-export - Get scheduled exports
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scheduledExports = await prisma.scheduledExport.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const exports = scheduledExports.map(exp => ({
      ...exp,
      sections: JSON.parse(exp.sections),
      recipients: JSON.parse(exp.recipients)
    }));

    return NextResponse.json({ scheduledExports: exports });
  } catch (error) {
    console.error('Get scheduled exports error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled exports' },
      { status: 500 }
    );
  }
}

// PUT /api/analytics/schedule-export - Update scheduled export
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, updates } = body;

    const scheduledExport = await prisma.scheduledExport.update({
      where: {
        id,
        userId: user.id
      },
      data: {
        ...updates,
        ...(updates.sections && { sections: JSON.stringify(updates.sections) }),
        ...(updates.recipients && { recipients: JSON.stringify(updates.recipients) }),
        ...(updates.frequency && updates.scheduledTime && {
          nextExecution: calculateNextExecution(updates.frequency, updates.scheduledTime)
        }),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      scheduledExport
    });
  } catch (error) {
    console.error('Update scheduled export error:', error);
    return NextResponse.json(
      { error: 'Failed to update scheduled export' },
      { status: 500 }
    );
  }
}

// DELETE /api/analytics/schedule-export - Delete scheduled export
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Export ID required' }, { status: 400 });
    }

    await prisma.scheduledExport.delete({
      where: {
        id,
        userId: user.id
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Scheduled export deleted'
    });
  } catch (error) {
    console.error('Delete scheduled export error:', error);
    return NextResponse.json(
      { error: 'Failed to delete scheduled export' },
      { status: 500 }
    );
  }
}

function calculateNextExecution(frequency: string, time: string): Date {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  
  const nextExecution = new Date();
  nextExecution.setHours(hours, minutes, 0, 0);
  
  switch (frequency) {
    case 'daily':
      if (nextExecution <= now) {
        nextExecution.setDate(nextExecution.getDate() + 1);
      }
      break;
    
    case 'weekly':
      // Schedule for next Monday
      const daysUntilMonday = (7 - nextExecution.getDay() + 1) % 7 || 7;
      nextExecution.setDate(nextExecution.getDate() + daysUntilMonday);
      break;
    
    case 'monthly':
      // Schedule for first day of next month
      nextExecution.setMonth(nextExecution.getMonth() + 1, 1);
      break;
    
    default:
      // Default to weekly
      const daysUntilMondayDefault = (7 - nextExecution.getDay() + 1) % 7 || 7;
      nextExecution.setDate(nextExecution.getDate() + daysUntilMondayDefault);
  }
  
  return nextExecution;
}