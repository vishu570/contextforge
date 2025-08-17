import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  structure: z.record(z.string(), z.any()),
  rules: z.record(z.string(), z.any()).default({}),
  category: z.string().optional(),
  isPublic: z.boolean().default(false),
});

// GET /api/folders/templates - Get folder templates
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
    const category = searchParams.get('category');
    const includePublic = searchParams.get('includePublic') !== 'false';

    let whereClause: any = {};
    
    if (includePublic) {
      whereClause = {
        OR: [
          { createdBy: user.id },
          { isPublic: true }
        ]
      };
    } else {
      whereClause = { createdBy: user.id };
    }

    if (category) {
      whereClause.category = category;
    }

    const templates = await prisma.folderTemplate.findMany({
      where: whereClause,
      orderBy: [
        { usageCount: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching folder templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

// POST /api/folders/templates - Create a new folder template
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
    const data = createTemplateSchema.parse(body);

    const template = await prisma.folderTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        structure: JSON.stringify(data.structure),
        rules: JSON.stringify(data.rules),
        category: data.category,
        isPublic: data.isPublic,
        createdBy: user.id,
      }
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating folder template:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}