import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as yaml from 'js-yaml';

// GET /api/export - Export item(s) in various formats
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

    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json';
    const itemId = url.searchParams.get('itemId');
    const itemIds = url.searchParams.get('itemIds')?.split(',');

    let items;
    if (itemId) {
      // Export single item
      const item = await prisma.item.findFirst({
        where: { id: itemId, userId: user.id },
        include: {
          tags: { include: { tag: true } },
          collections: { include: { collection: true } }
        }
      });
      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      items = [item];
    } else if (itemIds) {
      // Export multiple items
      items = await prisma.item.findMany({
        where: { id: { in: itemIds }, userId: user.id },
        include: {
          tags: { include: { tag: true } },
          collections: { include: { collection: true } }
        }
      });
    } else {
      // Export all items
      items = await prisma.item.findMany({
        where: { userId: user.id },
        include: {
          tags: { include: { tag: true } },
          collections: { include: { collection: true } }
        }
      });
    }

    // Transform items for export
    const exportData = items.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      content: item.content,
      format: item.format,
      tags: item.tags.map(t => t.tag.name),
      collections: item.collections.map(c => c.collection.name),
      metadata: typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    const timestamp = new Date().toISOString().split('T')[0];
    const isBundle = items.length > 1;
    const baseFilename = isBundle ? `contextforge-export-${timestamp}` : `${items[0].name || 'item'}-${timestamp}`;

    switch (format) {
      case 'json': {
        const jsonData = isBundle ? exportData : exportData[0];
        return new NextResponse(JSON.stringify(jsonData, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${baseFilename}.json"`
          }
        });
      }

      case 'yaml': {
        const yamlData = isBundle ? exportData : exportData[0];
        const yamlContent = yaml.dump(yamlData, { indent: 2 });
        return new NextResponse(yamlContent, {
          headers: {
            'Content-Type': 'application/x-yaml',
            'Content-Disposition': `attachment; filename="${baseFilename}.yaml"`
          }
        });
      }

      case 'bundle': {
        // Create a bundle with metadata and content files
        const bundle = {
          metadata: {
            exportedAt: new Date().toISOString(),
            exportedBy: user.email,
            totalItems: items.length,
            version: '1.0'
          },
          items: exportData
        };

        return new NextResponse(JSON.stringify(bundle, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${baseFilename}-bundle.json"`
          }
        });
      }

      default:
        return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}