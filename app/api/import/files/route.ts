import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseFile } from '@/lib/parsers';
import formidable from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';

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

    // Get form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Create import record
    const importRecord = await prisma.import.create({
      data: {
        userId: user.id,
        status: 'processing',
        totalFiles: files.length,
        processedFiles: 0,
        failedFiles: 0,
        metadata: JSON.stringify({
          source: 'file_upload',
          timestamp: new Date().toISOString(),
        }),
      },
    });

    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process each file
    for (const file of files) {
      try {
        const content = await file.text();
        const parsedItems = await parseFile(file.name, content);
        
        // Create source record
        const source = await prisma.source.create({
          data: {
            type: 'file',
            filePath: file.name,
            lastImportedAt: new Date(),
          },
        });

        // Save each parsed item
        for (const item of parsedItems) {
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
                  format: item.format,
                  metadata: JSON.stringify(item.metadata),
                  author: item.author,
                  language: item.language,
                  targetModels: item.targetModels,
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
                    filename: file.name,
                    itemName: item.name,
                    type: item.type,
                  }),
                },
              });
              
              imported++;
            }
          } catch (error) {
            console.error(`Error saving item from ${file.name}:`, error);
            failed++;
          }
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        errors.push(`Failed to process ${file.name}`);
        failed++;
      }
    }

    // Update import record
    await prisma.import.update({
      where: { id: importRecord.id },
      data: {
        status: failed === files.length ? 'failed' : 'completed',
        processedFiles: files.length - failed,
        failedFiles: failed,
        completedAt: new Date(),
        errorLog: errors.length > 0 ? errors.join('\n') : null,
      },
    });

    return NextResponse.json({
      success: true,
      imported,
      failed,
      total: files.length,
      importId: importRecord.id,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import files' },
      { status: 500 }
    );
  }
}