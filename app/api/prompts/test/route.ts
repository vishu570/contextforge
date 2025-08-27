import { NextRequest, NextResponse } from 'next/server';
import { EnhancedLLMService } from '@/src/lib/ai-integrations/enhanced-llm-service';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

const testRequestSchema = z.object({
  prompt: z.string().min(1),
  modelConfigs: z.array(z.object({
    modelId: z.string(),
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),
    topP: z.number().optional(),
    frequencyPenalty: z.number().optional(),
    presencePenalty: z.number().optional(),
  })),
  variables: z.record(z.any()).optional(),
  functions: z.array(z.object({
    name: z.string(),
    description: z.string(),
    parameters: z.any(),
  })).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { prompt, modelConfigs, variables = {}, functions = [] } = testRequestSchema.parse(body);

    // Initialize LLM service
    const llmService = new EnhancedLLMService(session.user.email);

    // Interpolate variables in prompt
    let interpolatedPrompt = prompt;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      interpolatedPrompt = interpolatedPrompt.replace(regex, String(value));
    });

    // Test with each model configuration
    const testResults = await Promise.allSettled(
      modelConfigs.map(async (config) => {
        const startTime = Date.now();
        
        try {
          const messages = [{ role: 'user' as const, content: interpolatedPrompt }];
          
          const result = await llmService.generateChatCompletion(messages, {
            provider: getModelProvider(config.modelId),
            model: config.modelId,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            topP: config.topP,
            frequencyPenalty: config.frequencyPenalty,
            presencePenalty: config.presencePenalty,
            functions: functions.length > 0 ? functions : undefined,
          });

          return {
            modelId: config.modelId,
            success: true,
            response: result.content,
            usage: result.usage,
            cost: result.cost,
            duration: Date.now() - startTime,
            metrics: {
              relevance: Math.random() * 0.3 + 0.7, // Mock metrics
              coherence: Math.random() * 0.2 + 0.8,
              completeness: Math.random() * 0.4 + 0.6,
              creativity: config.temperature && config.temperature > 0.8 
                ? Math.random() * 0.2 + 0.8 
                : Math.random() * 0.6 + 0.4
            }
          };
        } catch (error) {
          return {
            modelId: config.modelId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime,
          };
        }
      })
    );

    // Process results
    const processedResults = testResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          modelId: modelConfigs[index].modelId,
          success: false,
          error: result.reason,
          duration: 0,
        };
      }
    });

    // Calculate summary metrics
    const successfulResults = processedResults.filter(r => r.success);
    const summary = {
      totalTests: processedResults.length,
      successful: successfulResults.length,
      failed: processedResults.length - successfulResults.length,
      totalCost: successfulResults.reduce((sum, r) => sum + (r.cost || 0), 0),
      averageDuration: successfulResults.reduce((sum, r) => sum + r.duration, 0) / Math.max(successfulResults.length, 1),
      totalTokens: successfulResults.reduce((sum, r) => sum + (r.usage?.totalTokens || 0), 0),
    };

    return NextResponse.json({
      results: processedResults,
      summary,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Prompt test error:', error);
    return NextResponse.json(
      { error: 'Failed to test prompt' },
      { status: 500 }
    );
  }
}

// Compare multiple prompts
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { prompts, modelId } = z.object({
      prompts: z.array(z.string()),
      modelId: z.string(),
    }).parse(body);

    const llmService = new EnhancedLLMService(session.user.email);
    
    const comparison = await llmService.compareModels(
      prompts[0], // Use first prompt as reference
      [modelId],
      {}
    );

    // Test all prompts with the specified model
    const results = await Promise.all(
      prompts.map(async (prompt, index) => {
        try {
          const messages = [{ role: 'user' as const, content: prompt }];
          const result = await llmService.generateChatCompletion(messages, {
            provider: getModelProvider(modelId),
            model: modelId,
            temperature: 0.7,
            maxTokens: 1000,
          });

          return {
            index,
            prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
            response: result.content,
            usage: result.usage,
            cost: result.cost,
            score: Math.random() * 30 + 70, // Mock scoring
          };
        } catch (error) {
          return {
            index,
            prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
            error: error instanceof Error ? error.message : 'Unknown error',
            score: 0,
          };
        }
      })
    );

    // Rank results by score
    const rankedResults = results
      .filter(r => !r.error)
      .sort((a, b) => b.score - a.score)
      .map((result, index) => ({ ...result, rank: index + 1 }));

    return NextResponse.json({
      results: rankedResults,
      winner: rankedResults[0],
      modelId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Prompt comparison error:', error);
    return NextResponse.json(
      { error: 'Failed to compare prompts' },
      { status: 500 }
    );
  }
}

function getModelProvider(modelId: string): 'openai' | 'anthropic' | 'google' | 'custom' {
  if (modelId.includes('gpt') || modelId.includes('openai')) {
    return 'openai';
  } else if (modelId.includes('claude') || modelId.includes('anthropic')) {
    return 'anthropic';
  } else if (modelId.includes('gemini') || modelId.includes('google')) {
    return 'google';
  } else {
    return 'custom';
  }
}