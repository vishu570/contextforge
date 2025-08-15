import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseFile } from '@/lib/parsers';
import { Octokit } from 'octokit';
import { z } from 'zod';
import { minimatch } from 'minimatch';

const githubImportSchema = z.object({
  url: z.string().url(),
  branch: z.string().default('main'),
  pathGlob: z.string().default('**/*.{md,json,yaml,yml,xml,prompt,agent,af,mdc}'),
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
    const { url, branch, pathGlob } = githubImportSchema.parse(body);

    // Parse GitHub URL
    const urlMatch = url.match(/github\.com\/([^\/]+)\/([^\/\?]+)/);
    if (!urlMatch) {
      return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 });
    }

    const [, owner, repoName] = urlMatch;
    const repo = repoName.replace(/\.git$/, '');

    // Get GitHub token from environment or user's stored key
    let githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      const githubApiKey = await prisma.apiKey.findFirst({
        where: {
          userId: user.id,
          provider: 'github',
        },
      });
      
      if (githubApiKey) {
        const { decryptApiKey } = await import('@/lib/auth');
        githubToken = decryptApiKey(githubApiKey.encryptedKey);
      }
    }

    // Initialize Octokit with or without auth
    const octokit = new Octokit(
      githubToken ? { auth: githubToken } : {}
    );

    // Create import record
    const importRecord = await prisma.import.create({
      data: {
        userId: user.id,
        status: 'processing',
        totalFiles: 0,
        processedFiles: 0,
        failedFiles: 0,
        metadata: JSON.stringify({
          source: 'github',
          repository: `${owner}/${repo}`,
          branch,
          pathGlob,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    // Create source record
    const source = await prisma.source.create({
      data: {
        type: 'github',
        url,
        repoOwner: owner,
        repoName: repo,
        branch,
        pathGlob,
        lastImportedAt: new Date(),
      },
    });

    let imported = 0;
    let failed = 0;
    const errors: string[] = [];
    let totalFiles = 0;

    try {
      // Get repository tree - use recursive to get all files
      const { data: treeData } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: branch,
        recursive: 'true',
      });

      // Filter files based on glob pattern
      const matchingFiles = treeData.tree.filter(item => {
        if (item.type !== 'blob' || !item.path) return false;
        
        // Convert glob pattern to work with minimatch
        const patterns = pathGlob.split(',').map(p => p.trim());
        return patterns.some(pattern => minimatch(item.path, pattern));
      });

      totalFiles = matchingFiles.length;

      // Update total files count
      await prisma.import.update({
        where: { id: importRecord.id },
        data: { totalFiles },
      });

      // If no files matched, try with all markdown files as fallback
      if (totalFiles === 0) {
        const mdFiles = treeData.tree.filter(item => {
          return item.type === 'blob' && item.path && item.path.endsWith('.md');
        });
        
        if (mdFiles.length > 0) {
          matchingFiles.push(...mdFiles);
          totalFiles = mdFiles.length;
          
          // Update total files count
          await prisma.import.update({
            where: { id: importRecord.id },
            data: { totalFiles },
          });
        }
      }

      // Process each matching file
      for (const file of matchingFiles) {
        if (!file.path || !file.sha) continue;

        try {
          // Get file content
          const { data: fileData } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: file.path,
            ref: branch,
          });

          if ('content' in fileData && fileData.type === 'file') {
            // Decode base64 content
            const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
            
            // Parse the file
            const parsedItems = await parseFile(file.path, content);

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
                      metadata: JSON.stringify({
                        ...item.metadata,
                        githubPath: file.path,
                        repository: `${owner}/${repo}`,
                        branch,
                      }),
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
                        source: 'github',
                        repository: `${owner}/${repo}`,
                        path: file.path,
                        itemName: item.name,
                        type: item.type,
                      }),
                    },
                  });

                  imported++;
                }
              } catch (error) {
                console.error(`Error saving item from ${file.path}:`, error);
                failed++;
              }
            }
          }
        } catch (error) {
          console.error(`Error processing file ${file.path}:`, error);
          errors.push(`Failed to process ${file.path}`);
          failed++;
        }
      }
    } catch (error) {
      console.error('GitHub API error:', error);
      
      // Update import record with failure
      await prisma.import.update({
        where: { id: importRecord.id },
        data: {
          status: 'failed',
          failedFiles: totalFiles,
          completedAt: new Date(),
          errorLog: `GitHub API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      });

      return NextResponse.json(
        { 
          error: 'Failed to access GitHub repository. Make sure it\'s public or you have configured a GitHub token.',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Update import record
    await prisma.import.update({
      where: { id: importRecord.id },
      data: {
        status: failed === totalFiles ? 'failed' : 'completed',
        processedFiles: totalFiles - failed,
        failedFiles: failed,
        completedAt: new Date(),
        errorLog: errors.length > 0 ? errors.join('\n') : null,
      },
    });

    return NextResponse.json({
      success: true,
      imported,
      failed,
      total: totalFiles,
      importId: importRecord.id,
      repository: `${owner}/${repo}`,
      branch,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Import error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to import from GitHub' },
      { status: 500 }
    );
  }
}