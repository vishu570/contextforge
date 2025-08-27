import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const functionDefinitionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  category: z.string().min(1).max(50),
  parameters: z.array(z.object({
    name: z.string().min(1),
    type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
    description: z.string().optional(),
    required: z.boolean(),
    defaultValue: z.any().optional(),
    enum: z.array(z.string()).optional(),
  })),
  endpoint: z.string().url().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
  headers: z.record(z.string()).optional(),
  authentication: z.object({
    type: z.enum(['bearer', 'apikey', 'basic', 'none']),
    key: z.string().optional(),
    value: z.string().optional(),
  }).optional(),
  examples: z.array(z.object({
    name: z.string(),
    parameters: z.record(z.any()),
    expectedResponse: z.any().optional(),
  })).optional(),
  tags: z.array(z.string()).max(10),
});

const functionUpdateSchema = functionDefinitionSchema.partial();

// GET /api/functions - List user's custom functions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const tags = searchParams.get('tags')?.split(',');

    // Get user functions from database
    const functions = await prisma.customFunction.findMany({
      where: {
        userId: session.user.email,
        ...(category && { category }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ]
        }),
        ...(tags && {
          tags: {
            hasSome: tags
          }
        }),
      },
      orderBy: [
        { isActive: 'desc' },
        { updatedAt: 'desc' }
      ]
    });

    // Include built-in functions
    const builtInFunctions = [
      {
        id: 'web-search',
        name: 'Web Search',
        description: 'Search the web for information',
        category: 'Web Search',
        parameters: [
          {
            name: 'query',
            type: 'string',
            description: 'Search query',
            required: true
          },
          {
            name: 'limit',
            type: 'number',
            description: 'Number of results to return',
            required: false,
            defaultValue: 10
          }
        ],
        isActive: true,
        isBuiltIn: true,
        tags: ['search', 'web', 'information'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'http-request',
        name: 'HTTP Request',
        description: 'Make HTTP requests to external APIs',
        category: 'API Calls',
        parameters: [
          {
            name: 'url',
            type: 'string',
            description: 'The URL to make the request to',
            required: true
          },
          {
            name: 'method',
            type: 'string',
            description: 'HTTP method',
            required: false,
            defaultValue: 'GET',
            enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
          }
        ],
        isActive: true,
        isBuiltIn: true,
        tags: ['http', 'api', 'request'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    const allFunctions = [
      ...builtInFunctions,
      ...functions.map(func => ({
        ...func,
        parameters: func.parameters as any[],
        headers: func.headers as Record<string, string> | null,
        authentication: func.authentication as any,
        examples: func.examples as any[],
        isBuiltIn: false,
      }))
    ];

    return NextResponse.json({
      functions: allFunctions,
      total: allFunctions.length,
    });

  } catch (error) {
    console.error('Function list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch functions' },
      { status: 500 }
    );
  }
}

// POST /api/functions - Create a new custom function
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
    const functionData = functionDefinitionSchema.parse(body);

    // Check if function name already exists for this user
    const existingFunction = await prisma.customFunction.findFirst({
      where: {
        userId: session.user.email,
        name: functionData.name,
      }
    });

    if (existingFunction) {
      return NextResponse.json(
        { error: 'A function with this name already exists' },
        { status: 400 }
      );
    }

    // Create the function
    const newFunction = await prisma.customFunction.create({
      data: {
        userId: session.user.email,
        name: functionData.name,
        description: functionData.description,
        category: functionData.category,
        parameters: functionData.parameters,
        endpoint: functionData.endpoint,
        method: functionData.method || 'GET',
        headers: functionData.headers || {},
        authentication: functionData.authentication || { type: 'none' },
        examples: functionData.examples || [],
        tags: functionData.tags,
        isActive: true,
      }
    });

    return NextResponse.json({
      function: {
        ...newFunction,
        parameters: newFunction.parameters as any[],
        headers: newFunction.headers as Record<string, string>,
        authentication: newFunction.authentication as any,
        examples: newFunction.examples as any[],
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Function creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create function' },
      { status: 500 }
    );
  }
}

// PUT /api/functions/[id] - Update a custom function
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const functionId = params.id;
    const body = await request.json();
    const updateData = functionUpdateSchema.parse(body);

    // Check if function exists and belongs to user
    const existingFunction = await prisma.customFunction.findFirst({
      where: {
        id: functionId,
        userId: session.user.email,
      }
    });

    if (!existingFunction) {
      return NextResponse.json(
        { error: 'Function not found' },
        { status: 404 }
      );
    }

    // Update the function
    const updatedFunction = await prisma.customFunction.update({
      where: { id: functionId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      }
    });

    return NextResponse.json({
      function: {
        ...updatedFunction,
        parameters: updatedFunction.parameters as any[],
        headers: updatedFunction.headers as Record<string, string>,
        authentication: updatedFunction.authentication as any,
        examples: updatedFunction.examples as any[],
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Function update error:', error);
    return NextResponse.json(
      { error: 'Failed to update function' },
      { status: 500 }
    );
  }
}

// DELETE /api/functions/[id] - Delete a custom function
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const functionId = params.id;

    // Check if function exists and belongs to user
    const existingFunction = await prisma.customFunction.findFirst({
      where: {
        id: functionId,
        userId: session.user.email,
      }
    });

    if (!existingFunction) {
      return NextResponse.json(
        { error: 'Function not found' },
        { status: 404 }
      );
    }

    // Delete the function
    await prisma.customFunction.delete({
      where: { id: functionId }
    });

    return NextResponse.json({
      message: 'Function deleted successfully'
    });

  } catch (error) {
    console.error('Function deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete function' },
      { status: 500 }
    );
  }
}

// POST /api/functions/[id]/test - Test a function
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const functionId = params.id;
    const body = await request.json();
    const { parameters = {} } = body;

    // Get the function
    const customFunction = await prisma.customFunction.findFirst({
      where: {
        id: functionId,
        userId: session.user.email,
      }
    });

    if (!customFunction) {
      return NextResponse.json(
        { error: 'Function not found' },
        { status: 404 }
      );
    }

    // Test the function
    let testResult;
    
    if (customFunction.endpoint) {
      // Test HTTP endpoint
      try {
        const headers = {
          'Content-Type': 'application/json',
          ...(customFunction.headers as Record<string, string> || {}),
        };

        const auth = customFunction.authentication as any;
        if (auth?.type === 'bearer' && auth?.value) {
          headers['Authorization'] = `Bearer ${auth.value}`;
        } else if (auth?.type === 'apikey' && auth?.key && auth?.value) {
          headers[auth.key] = auth.value;
        }

        const fetchOptions: RequestInit = {
          method: customFunction.method || 'GET',
          headers,
        };

        if (customFunction.method !== 'GET' && Object.keys(parameters).length > 0) {
          fetchOptions.body = JSON.stringify(parameters);
        }

        const response = await fetch(customFunction.endpoint, fetchOptions);
        const data = await response.text();

        testResult = {
          success: response.ok,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          data: response.headers.get('content-type')?.includes('application/json') 
            ? JSON.parse(data) 
            : data,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        testResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        };
      }
    } else {
      // Mock test for functions without endpoints
      testResult = {
        success: true,
        message: 'Function test completed successfully',
        parameters,
        mockResponse: {
          status: 'success',
          data: 'Mock response data',
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    }

    return NextResponse.json({
      testResult,
      function: customFunction,
    });

  } catch (error) {
    console.error('Function test error:', error);
    return NextResponse.json(
      { error: 'Failed to test function' },
      { status: 500 }
    );
  }
}