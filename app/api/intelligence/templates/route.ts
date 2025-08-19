import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';

import ContextAssemblyEngine from '@/lib/context/assembly';

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
    const { 
      name, 
      template, 
      description,
      category,
      targetModel,
      variables = {},
      isPublic = false
    } = body;

    if (!name || !template) {
      return NextResponse.json(
        { error: 'Name and template content are required' },
        { status: 400 }
      );
    }

    const assemblyEngine = new ContextAssemblyEngine(user.id);
    
    const templateId = await assemblyEngine.createTemplate(name, template, {
      description,
      category,
      targetModel,
      variables,
      isPublic,
    });

    return NextResponse.json({
      success: true,
      templateId,
    });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

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

    const assemblyEngine = new ContextAssemblyEngine(user.id);
    const templates = await assemblyEngine.getUserTemplates();

    return NextResponse.json({
      templates,
    });
  } catch (error) {
    console.error('Error retrieving templates:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve templates' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const { 
      templateId,
      name, 
      template, 
      description,
      category,
      targetModel,
      variables = {},
      isPublic = false
    } = body;

    if (!templateId || !name || !template) {
      return NextResponse.json(
        { error: 'Template ID, name, and template content are required' },
        { status: 400 }
      );
    }

    const { prisma } = await import('@/lib/db');
    
    // Verify template ownership
    const existingTemplate = await prisma.contextTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existingTemplate || existingTemplate.userId !== user.id) {
      return NextResponse.json(
        { error: 'Template not found or unauthorized' },
        { status: 404 }
      );
    }

    await prisma.contextTemplate.update({
      where: { id: templateId },
      data: {
        name,
        description,
        template,
        variables: JSON.stringify(variables),
        targetModel,
        category,
        isPublic,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const templateId = url.searchParams.get('templateId');

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const { prisma } = await import('@/lib/db');
    
    // Verify template ownership
    const existingTemplate = await prisma.contextTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existingTemplate || existingTemplate.userId !== user.id) {
      return NextResponse.json(
        { error: 'Template not found or unauthorized' },
        { status: 404 }
      );
    }

    await prisma.contextTemplate.delete({
      where: { id: templateId },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}