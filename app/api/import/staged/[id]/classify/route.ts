import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { LLMService } from '@/lib/llm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params;
    const itemId = resolvedParams.id;
    const { content, name, type } = await request.json();

    // Check if any API keys are configured
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: user.id },
    });

    if (apiKeys.length === 0) {
      return NextResponse.json(
        { error: 'No LLM API keys configured. Please add API keys in Settings.' },
        { status: 400 }
      );
    }

    const llmService = new LLMService(user.id);
    
    // Enhanced classification with more context
    const classificationResult = await llmService.classifyContent(content, {
      name,
      currentType: type,
      enhancedAnalysis: true,
    });

    // Generate suggested organization path
    const suggestedPath = generateSuggestedPath(classificationResult.type, name, classificationResult.metadata);

    // Analyze content for metadata extraction
    const metadata = await extractMetadata(content, classificationResult.type);

    return NextResponse.json({
      success: true,
      classification: {
        type: classificationResult.type,
        confidence: classificationResult.confidence,
        reasoning: classificationResult.reasoning,
        metadata: classificationResult.metadata,
      },
      suggestedPath,
      extractedMetadata: metadata,
    });
  } catch (error) {
    console.error('Error classifying content:', error);
    return NextResponse.json(
      { error: 'Failed to classify content' },
      { status: 500 }
    );
  }
}

function generateSuggestedPath(type: string, name: string, metadata: any): string {
  const basePath = `/${type}s`;
  
  // Add category-based subdirectory
  if (metadata?.category) {
    return `${basePath}/${metadata.category}/${sanitizeFileName(name)}`;
  }
  
  // Add language-based subdirectory for code snippets
  if (type === 'snippet' && metadata?.language) {
    return `${basePath}/${metadata.language}/${sanitizeFileName(name)}`;
  }
  
  // Add model-specific subdirectory for agents
  if (type === 'agent' && metadata?.targetModel) {
    return `${basePath}/${metadata.targetModel}/${sanitizeFileName(name)}`;
  }
  
  return `${basePath}/${sanitizeFileName(name)}`;
}

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function extractMetadata(content: string, type: string): Promise<Record<string, any>> {
  const metadata: Record<string, any> = {};
  
  // Extract programming language for code snippets
  if (type === 'snippet' || type === 'template') {
    const languagePattern = /```(\w+)/;
    const match = content.match(languagePattern);
    if (match) {
      metadata.language = match[1];
    }
  }
  
  // Extract model references
  const modelPatterns = [
    /gpt-?[34]?/i,
    /claude/i,
    /gemini/i,
    /llama/i,
    /anthropic/i,
    /openai/i,
  ];
  
  for (const pattern of modelPatterns) {
    if (pattern.test(content)) {
      metadata.referencesModels = true;
      break;
    }
  }
  
  // Extract complexity indicators
  const complexityIndicators = {
    simple: ['basic', 'simple', 'easy', 'beginner'],
    intermediate: ['intermediate', 'moderate', 'standard'],
    advanced: ['advanced', 'complex', 'expert', 'sophisticated'],
  };
  
  for (const [level, keywords] of Object.entries(complexityIndicators)) {
    if (keywords.some(keyword => content.toLowerCase().includes(keyword))) {
      metadata.complexity = level;
      break;
    }
  }
  
  // Extract word count and character count
  metadata.wordCount = content.split(/\s+/).length;
  metadata.characterCount = content.length;
  
  // Extract potential tags from content
  const tagPatterns = [
    /#(\w+)/g, // hashtags
    /\b(react|vue|angular|python|javascript|typescript|node|express|fastapi|django)\b/gi, // tech keywords
  ];
  
  const tags = new Set<string>();
  for (const pattern of tagPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      tags.add(match[1].toLowerCase());
    }
  }
  
  if (tags.size > 0) {
    metadata.extractedTags = Array.from(tags);
  }
  
  return metadata;
}