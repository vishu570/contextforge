import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import formidable from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';

const importConfigSchema = z.object({
  format: z.enum(['csv', 'json', 'yaml']).default('csv'),
  itemType: z.enum(['prompt', 'agent', 'rule', 'template']).optional(),
  autoDetect: z.boolean().default(true),
  delimiter: z.string().default(','),
  skipFirstRow: z.boolean().default(true),
  mapping: z.record(z.string()).optional(),
  batchSize: z.number().min(1).max(1000).default(100),
  validateOnly: z.boolean().default(false)
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', 'imports');
    await fs.mkdir(uploadDir, { recursive: true });

    // Parse multipart form data
    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ mimetype }) => {
        return (
          mimetype?.includes('text/csv') ||
          mimetype?.includes('application/json') ||
          mimetype?.includes('text/yaml') ||
          mimetype?.includes('text/plain') ||
          false
        );
      }
    });

    const [fields, files] = await form.parse(request as any);
    
    if (!files.file || !files.file[0]) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const file = files.file[0];
    const config = fields.config ? JSON.parse(fields.config[0]) : {};
    const validatedConfig = importConfigSchema.parse(config);

    // Read and analyze file content
    const fileContent = await fs.readFile(file.filepath, 'utf-8');
    
    let parsedData: any[] = [];
    let detectedFormat = validatedConfig.format;
    
    // Auto-detect format if enabled
    if (validatedConfig.autoDetect) {
      if (file.originalFilename?.endsWith('.json') || fileContent.trim().startsWith('[')) {
        detectedFormat = 'json';
      } else if (file.originalFilename?.endsWith('.yaml') || file.originalFilename?.endsWith('.yml')) {
        detectedFormat = 'yaml';
      } else {
        detectedFormat = 'csv';
      }
    }

    // Parse content based on format
    try {
      switch (detectedFormat) {
        case 'json':
          parsedData = JSON.parse(fileContent);
          break;
        case 'csv':
          parsedData = parseCSV(fileContent, validatedConfig);
          break;
        case 'yaml':
          // For simplicity, treating YAML as JSON for now
          // In production, use a proper YAML parser
          parsedData = JSON.parse(fileContent);
          break;
      }
    } catch (parseError) {
      return NextResponse.json({ 
        error: 'Failed to parse file content',
        details: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      }, { status: 400 });
    }

    // Validate and classify data
    const validationResults = await validateAndClassifyData(parsedData, validatedConfig, user.id);

    // If validation only, return results without importing
    if (validatedConfig.validateOnly) {
      return NextResponse.json({
        success: true,
        validation: validationResults,
        totalItems: parsedData.length,
        format: detectedFormat,
        config: validatedConfig
      });
    }

    // Create import job for background processing
    const importJob = {
      id: `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id,
      fileName: file.originalFilename || 'unknown',
      format: detectedFormat,
      totalItems: parsedData.length,
      validItems: validationResults.valid.length,
      errorItems: validationResults.errors.length,
      duplicates: validationResults.duplicates.length,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
      config: validatedConfig,
      data: validationResults.valid
    };

    // Store job info (in production, use a proper job queue like Bull/Redis)
    const jobsDir = path.join(process.cwd(), 'uploads', 'jobs');
    await fs.mkdir(jobsDir, { recursive: true });
    await fs.writeFile(
      path.join(jobsDir, `${importJob.id}.json`),
      JSON.stringify(importJob, null, 2)
    );

    // Start background processing (in production, queue this job)
    processImportJob(importJob.id).catch(console.error);

    return NextResponse.json({
      success: true,
      jobId: importJob.id,
      totalItems: parsedData.length,
      validItems: validationResults.valid.length,
      errors: validationResults.errors,
      duplicates: validationResults.duplicates,
      message: 'Import job started successfully'
    });

  } catch (error) {
    console.error('Import file error:', error);
    return NextResponse.json(
      { error: 'Failed to process import file' },
      { status: 500 }
    );
  }
}

function parseCSV(content: string, config: any): any[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const delimiter = config.delimiter || ',';
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
  
  const startRow = config.skipFirstRow ? 1 : 0;
  return lines.slice(startRow).map(line => {
    const values = line.split(delimiter).map(v => v.trim().replace(/"/g, ''));
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
}

async function validateAndClassifyData(data: any[], config: any, userId: string) {
  const valid: any[] = [];
  const errors: any[] = [];
  const duplicates: any[] = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    
    try {
      // Basic validation
      if (!item.title && !item.name) {
        errors.push({ index: i, error: 'Missing title/name', item });
        continue;
      }

      if (!item.content && !item.description) {
        errors.push({ index: i, error: 'Missing content/description', item });
        continue;
      }

      // Auto-detect item type if not specified
      let itemType = config.itemType;
      if (!itemType && config.autoDetect) {
        itemType = detectItemType(item);
      }

      // Normalize item structure
      const normalizedItem = {
        title: item.title || item.name || `Imported Item ${i + 1}`,
        content: item.content || item.description || '',
        type: itemType || 'prompt',
        tags: parseTagsField(item.tags || item.categories || ''),
        metadata: {
          imported: true,
          importedAt: new Date().toISOString(),
          originalIndex: i,
          source: item
        }
      };

      // Check for duplicates (simple title check)
      const isDuplicate = valid.some(v => 
        v.title.toLowerCase() === normalizedItem.title.toLowerCase() &&
        v.type === normalizedItem.type
      );

      if (isDuplicate) {
        duplicates.push({ index: i, item: normalizedItem, reason: 'Duplicate title' });
        continue;
      }

      valid.push(normalizedItem);

    } catch (validationError) {
      errors.push({ 
        index: i, 
        error: validationError instanceof Error ? validationError.message : 'Validation failed',
        item 
      });
    }
  }

  return { valid, errors, duplicates };
}

function detectItemType(item: any): string {
  const content = (item.content || item.description || '').toLowerCase();
  const title = (item.title || item.name || '').toLowerCase();
  
  // Agent detection
  if (title.includes('agent') || content.includes('behavior') || content.includes('personality')) {
    return 'agent';
  }
  
  // Rule detection  
  if (title.includes('rule') || content.includes('if ') || content.includes('condition')) {
    return 'rule';
  }
  
  // Template detection
  if (title.includes('template') || content.includes('{{') || content.includes('${')) {
    return 'template';
  }
  
  // Default to prompt
  return 'prompt';
}

function parseTagsField(tagsStr: string): string[] {
  if (!tagsStr) return [];
  
  // Handle various tag formats: "tag1,tag2", "tag1; tag2", ["tag1", "tag2"]
  let tags: string[] = [];
  
  if (tagsStr.startsWith('[') && tagsStr.endsWith(']')) {
    try {
      tags = JSON.parse(tagsStr);
    } catch {
      tags = tagsStr.slice(1, -1).split(',');
    }
  } else {
    tags = tagsStr.split(/[,;]/).map(t => t.trim());
  }
  
  return tags.filter(t => t.length > 0);
}

async function processImportJob(jobId: string) {
  // This would run in a background worker in production
  // For now, simulate processing with a simple timeout
  setTimeout(async () => {
    try {
      const jobsDir = path.join(process.cwd(), 'uploads', 'jobs');
      const jobFile = path.join(jobsDir, `${jobId}.json`);
      
      const jobData = JSON.parse(await fs.readFile(jobFile, 'utf-8'));
      
      // Update job status to processing
      jobData.status = 'processing';
      jobData.progress = 25;
      await fs.writeFile(jobFile, JSON.stringify(jobData, null, 2));
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mark as completed
      jobData.status = 'completed';
      jobData.progress = 100;
      jobData.completedAt = new Date().toISOString();
      await fs.writeFile(jobFile, JSON.stringify(jobData, null, 2));
      
    } catch (error) {
      console.error('Job processing error:', error);
    }
  }, 1000);
}