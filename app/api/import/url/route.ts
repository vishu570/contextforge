import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseFile } from '@/lib/parsers';
import { z } from 'zod';

const urlImportSchema = z.object({
  url: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { url } = urlImportSchema.parse(body);

    // Create import record
    const importRecord = await prisma.import.create({
      data: {
        userId: user.id,
        sourceType: 'url',
        status: 'processing',
        totalFiles: 1,
        processedFiles: 0,
        failedFiles: 0,
        metadata: JSON.stringify({
          source: 'url',
          url,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    // Create source record
    const source = await prisma.source.create({
      data: {
        type: 'website',
        url,
        lastImportedAt: new Date(),
      },
    });

    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      // Fetch the URL content
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ContextForge/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      // Determine filename based on URL
      const urlPath = new URL(url).pathname;
      const filename = urlPath.split('/').pop() || 'webpage.html';

      // Extract content from HTML if needed
      let content = text;
      const items: Array<{ name: string; content: string; type: any }> = [];

      if (contentType.includes('text/html')) {
        // Extract code blocks from HTML
        const codeBlockRegex = /<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi;
        const inlineCodeRegex = /<code[^>]*>([\s\S]*?)<\/code>/gi;
        
        let match;
        let blockIndex = 0;

        // Extract pre/code blocks
        while ((match = codeBlockRegex.exec(text)) !== null) {
          blockIndex++;
          const codeContent = match[1]
            .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

          const parsedItems = await parseFile(`${filename}_block_${blockIndex}`, codeContent);
          for (const item of parsedItems) {
            items.push(item);
          }
        }

        // Extract inline code if no blocks found
        if (items.length === 0) {
          while ((match = inlineCodeRegex.exec(text)) !== null) {
            blockIndex++;
            const codeContent = match[1]
              .replace(/<[^>]*>/g, '')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'");

            if (codeContent.length > 50) { // Only process substantial code snippets
              const parsedItems = await parseFile(`${filename}_inline_${blockIndex}`, codeContent);
              for (const item of parsedItems) {
                items.push(item);
              }
            }
          }
        }

        // Also extract markdown code blocks if present
        const mdCodeBlockRegex = /```(?:[a-z]+)?\n([\s\S]*?)```/gi;
        while ((match = mdCodeBlockRegex.exec(text)) !== null) {
          blockIndex++;
          const parsedItems = await parseFile(`${filename}_md_${blockIndex}`, match[1]);
          for (const item of parsedItems) {
            items.push(item);
          }
        }

        // If still no items found, try to parse the entire content
        if (items.length === 0) {
          // Remove HTML tags for plain text extraction
          const plainText = text
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]*>/g, '')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();

          if (plainText.length > 0) {
            const parsedItems = await parseFile(filename, plainText);
            for (const item of parsedItems) {
              items.push(item);
            }
          }
        }
      } else {
        // For non-HTML content, parse directly
        const parsedItems = await parseFile(filename, content);
        for (const item of parsedItems) {
          items.push(item);
        }
      }

      // Save each item
      for (const item of items) {
        try {
          // Check for duplicates
          const existingItem = await prisma.item.findFirst({
            where: {
              userId: user.id,
              name: item.name,
              content: item.content,
            },
          });

          if (!existingItem) {
            await prisma.item.create({
              data: {
                userId: user.id,
                type: item.type,
                name: item.name,
                content: item.content,
                format: 'html',
                metadata: JSON.stringify({
                  sourceUrl: url,
                  importedAt: new Date().toISOString(),
                }),
                sourceId: source.id,
              },
            });

            // Create audit log
            await prisma.auditLog.create({
              data: {
                userId: user.id,
                action: 'import',
                entityType: 'item',
                metadata: JSON.stringify({
                  source: 'url',
                  url,
                  itemName: item.name,
                  type: item.type,
                }),
              },
            });

            imported++;
          }
        } catch (error) {
          console.error(`Error saving item:`, error);
          failed++;
        }
      }

      if (imported === 0 && failed === 0) {
        errors.push('No importable content found on the page');
        failed = 1;
      }
    } catch (error) {
      console.error('URL fetch error:', error);
      errors.push(error instanceof Error ? error.message : 'Failed to fetch URL');
      failed = 1;

      // Update import record with failure
      await prisma.import.update({
        where: { id: importRecord.id },
        data: {
          status: 'failed',
          failedFiles: 1,
          completedAt: new Date(),
          errorLog: errors.join('\n'),
        },
      });

      return NextResponse.json(
        { 
          error: 'Failed to import from URL',
          details: errors
        },
        { status: 500 }
      );
    }

    // Update import record
    await prisma.import.update({
      where: { id: importRecord.id },
      data: {
        status: failed > 0 && imported === 0 ? 'failed' : 'completed',
        processedFiles: imported > 0 ? 1 : 0,
        failedFiles: failed > 0 && imported === 0 ? 1 : 0,
        completedAt: new Date(),
        errorLog: errors.length > 0 ? errors.join('\n') : null,
      },
    });

    return NextResponse.json({
      success: true,
      imported,
      failed,
      url,
      importId: importRecord.id,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Import error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to import from URL' },
      { status: 500 }
    );
  }
}