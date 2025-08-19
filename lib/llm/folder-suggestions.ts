import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

interface Item {
  id: string;
  name: string;
  content: string;
  type: string;
  subType?: string | null;
  metadata?: string;
  language?: string | null;
  targetModels?: string | null;
}

interface ExistingFolder {
  id: string;
  name: string;
  path: string;
  level: number;
  description?: string | null;
}

interface FolderSuggestion {
  path: string;
  rationale: string;
  confidence: number;
  itemIds: string[];
  suggestedName?: string;
  description?: string;
}

// Built-in folder templates for common structures
const FOLDER_TEMPLATES = {
  prompts: {
    '/prompts/development/backend': ['API development', 'Database queries', 'Server-side logic'],
    '/prompts/development/frontend': ['UI components', 'User interactions', 'Client-side logic'],
    '/prompts/development/devops': ['Deployment', 'Infrastructure', 'CI/CD'],
    '/prompts/content/writing': ['Blog posts', 'Documentation', 'Creative writing'],
    '/prompts/content/marketing': ['Social media', 'Email campaigns', 'Copy writing'],
    '/prompts/analysis/data': ['Data analysis', 'Reporting', 'Visualization'],
    '/prompts/analysis/research': ['Market research', 'Competitor analysis', 'User research'],
  },
  agents: {
    '/agents/customer-service': ['Support queries', 'FAQ responses', 'Complaint handling'],
    '/agents/sales': ['Lead qualification', 'Product demos', 'Objection handling'],
    '/agents/development': ['Code review', 'Bug triage', 'Technical documentation'],
    '/agents/content': ['Content generation', 'Editing', 'SEO optimization'],
  },
  rules: {
    '/rules/coding-standards/javascript': ['ES6+ standards', 'React patterns', 'Node.js best practices'],
    '/rules/coding-standards/python': ['PEP 8', 'Type hints', 'Testing patterns'],
    '/rules/coding-standards/general': ['Code review', 'Git workflow', 'Documentation'],
    '/rules/content-guidelines': ['Style guide', 'Tone of voice', 'Brand guidelines'],
    '/rules/business-logic': ['Validation rules', 'Workflow definitions', 'Approval processes'],
  },
  templates: {
    '/templates/documentation/api': ['OpenAPI specs', 'README templates', 'Changelog formats'],
    '/templates/documentation/user': ['User guides', 'Tutorials', 'FAQ templates'],
    '/templates/communication/email': ['Welcome emails', 'Newsletters', 'Notifications'],
    '/templates/communication/social': ['Post templates', 'Campaign formats', 'Response templates'],
  }
};

export async function generateFolderSuggestions(
  items: Item[],
  existingFolders: ExistingFolder[],
  analysisType: 'auto' | 'semantic' | 'template' = 'auto'
): Promise<FolderSuggestion[]> {
  if (items.length === 0) {
    return [];
  }

  const suggestions: FolderSuggestion[] = [];

  if (analysisType === 'template' || analysisType === 'auto') {
    // Generate template-based suggestions
    const templateSuggestions = generateTemplateSuggestions(items, existingFolders);
    suggestions.push(...templateSuggestions);
  }

  if (analysisType === 'semantic' || analysisType === 'auto') {
    // Generate AI-powered semantic suggestions
    const semanticSuggestions = await generateSemanticSuggestions(items, existingFolders);
    suggestions.push(...semanticSuggestions);
  }

  // Remove duplicates and sort by confidence
  const uniqueSuggestions = deduplicateSuggestions(suggestions);
  return uniqueSuggestions.sort((a, b) => b.confidence - a.confidence);
}

function generateTemplateSuggestions(
  items: Item[],
  existingFolders: ExistingFolder[]
): FolderSuggestion[] {
  const suggestions: FolderSuggestion[] = [];
  const itemsByType = groupItemsByType(items);

  Object.entries(itemsByType).forEach(([type, typeItems]) => {
    const templates = FOLDER_TEMPLATES[type as keyof typeof FOLDER_TEMPLATES];
    if (!templates) return;

    Object.entries(templates).forEach(([folderPath, keywords]) => {
      const matchingItems = typeItems.filter(item => 
        keywords.some(keyword => 
          item.name.toLowerCase().includes(keyword.toLowerCase()) ||
          item.content.toLowerCase().includes(keyword.toLowerCase()) ||
          (item.subType && item.subType.toLowerCase().includes(keyword.toLowerCase()))
        )
      );

      if (matchingItems.length > 0) {
        // Check if folder already exists
        const existingFolder = existingFolders.find(f => f.path === folderPath);
        if (existingFolder) return;

        suggestions.push({
          path: folderPath,
          rationale: `Based on template pattern for ${type}. Items match keywords: ${keywords.join(', ')}`,
          confidence: Math.min(0.9, 0.6 + (matchingItems.length / typeItems.length) * 0.3),
          itemIds: matchingItems.map(item => item.id),
          suggestedName: folderPath.split('/').pop(),
          description: `Auto-suggested folder for ${keywords.join(', ')} related items`
        });
      }
    });
  });

  return suggestions;
}

async function generateSemanticSuggestions(
  items: Item[],
  existingFolders: ExistingFolder[]
): Promise<FolderSuggestion[]> {
  const suggestions: FolderSuggestion[] = [];

  try {
    // Group items by type for more focused analysis
    const itemsByType = groupItemsByType(items);

    for (const [type, typeItems] of Object.entries(itemsByType)) {
      if (typeItems.length < 2) continue; // Need at least 2 items to suggest grouping

      const semanticGroups = await analyzeSemanticGroups(typeItems, type);
      
      semanticGroups.forEach((group: any) => {
        const basePath = `/${type.toLowerCase()}`;
        const suggestedPath = generatePathFromGroup(group, basePath, existingFolders);
        
        if (suggestedPath && group.items.length >= 2) {
          suggestions.push({
            path: suggestedPath,
            rationale: group.rationale,
            confidence: group.confidence,
            itemIds: group.items.map((item: any) => item.id),
            suggestedName: suggestedPath.split('/').pop(),
            description: group.description
          });
        }
      });
    }
  } catch (error) {
    console.error('Error generating semantic suggestions:', error);
    // Fallback to simpler rule-based suggestions
    return generateFallbackSuggestions(items, existingFolders);
  }

  return suggestions;
}

async function analyzeSemanticGroups(items: Item[], type: string) {
  // Prepare items for analysis
  const itemsForAnalysis = items.map(item => ({
    id: item.id,
    name: item.name,
    content: item.content.substring(0, 1000), // Limit content length
    type: item.type,
    subType: item.subType,
    language: item.language,
    targetModels: item.targetModels
  }));

  const prompt = `
Analyze the following ${type} items and suggest logical groupings for folder organization.

Items to analyze:
${itemsForAnalysis.map((item, index) => 
  `${index + 1}. ${item.name}
     Type: ${item.type}${item.subType ? ` (${item.subType})` : ''}
     Content preview: ${item.content.substring(0, 200)}...
     ${item.language ? `Language: ${item.language}` : ''}
     ${item.targetModels ? `Target Models: ${item.targetModels}` : ''}
`).join('\n')}

Please suggest logical folder groupings based on:
1. Functional similarity (what they do)
2. Domain/topic similarity (what they're about)
3. Technical patterns (how they work)
4. Use case similarity (when they're used)

For each suggested group, provide:
- A descriptive folder name (no spaces, use kebab-case)
- A list of item IDs that belong in this group
- A rationale for the grouping
- A confidence score (0.0 to 1.0)
- A brief description

Respond in valid JSON format:
{
  "groups": [
    {
      "folderName": "example-folder-name",
      "itemIds": ["id1", "id2"],
      "rationale": "These items are grouped because...",
      "confidence": 0.85,
      "description": "Brief description of what this folder contains"
    }
  ]
}
`;

  try {
    // Try OpenAI first, then fallback to simple analysis
    const response = await callLLM(prompt);
    const analysis = JSON.parse(response);
    
    return analysis.groups.map((group: any) => ({
      ...group,
      items: items.filter(item => group.itemIds.includes(item.id))
    }));
  } catch (error) {
    console.error('Error in semantic analysis:', error);
    return generateSimpleGroups(items);
  }
}

async function callLLM(prompt: string): Promise<string> {
  // Try to use available LLM APIs
  try {
    // Check if OpenAI is available
    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      });
      
      return response.choices[0]?.message?.content || '';
    }
    
    // Check if Anthropic is available
    if (process.env.ANTHROPIC_API_KEY) {
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
      
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });
      
      return response.content[0]?.type === 'text' ? response.content[0].text : '';
    }
    
    throw new Error('No LLM API keys available');
  } catch (error) {
    console.error('LLM API call failed:', error);
    throw error;
  }
}

function generateSimpleGroups(items: Item[]) {
  const groups: any[] = [];
  
  // Group by subType if available
  const bySubType = items.reduce((acc, item) => {
    const key = item.subType || 'general';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, Item[]>);
  
  Object.entries(bySubType).forEach(([subType, groupItems]) => {
    if (groupItems.length >= 2) {
      groups.push({
        folderName: subType.toLowerCase().replace(/\s+/g, '-'),
        itemIds: groupItems.map(item => item.id),
        items: groupItems,
        rationale: `Grouped by subtype: ${subType}`,
        confidence: 0.7,
        description: `Items of type ${subType}`
      });
    }
  });
  
  return groups;
}

function generatePathFromGroup(
  group: any,
  basePath: string,
  existingFolders: ExistingFolder[]
): string | null {
  let suggestedPath = `${basePath}/${group.folderName}`;
  
  // Check if path already exists
  if (existingFolders.some(f => f.path === suggestedPath)) {
    // Try adding a suffix
    let counter = 1;
    while (existingFolders.some(f => f.path === `${suggestedPath}-${counter}`)) {
      counter++;
    }
    suggestedPath = `${suggestedPath}-${counter}`;
  }
  
  return suggestedPath;
}

function groupItemsByType(items: Item[]): Record<string, Item[]> {
  return items.reduce((acc, item) => {
    const type = item.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {} as Record<string, Item[]>);
}

function deduplicateSuggestions(suggestions: FolderSuggestion[]): FolderSuggestion[] {
  const seen = new Set<string>();
  return suggestions.filter(suggestion => {
    const key = suggestion.path;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function generateFallbackSuggestions(
  items: Item[],
  existingFolders: ExistingFolder[]
): FolderSuggestion[] {
  const suggestions: FolderSuggestion[] = [];
  const itemsByType = groupItemsByType(items);
  
  // Simple type-based grouping
  Object.entries(itemsByType).forEach(([type, typeItems]) => {
    if (typeItems.length >= 3) {
      const path = `/${type.toLowerCase()}/general`;
      
      if (!existingFolders.some(f => f.path === path)) {
        suggestions.push({
          path,
          rationale: `Fallback grouping by type: ${type}`,
          confidence: 0.5,
          itemIds: typeItems.map(item => item.id),
          suggestedName: 'general',
          description: `General ${type} items`
        });
      }
    }
  });
  
  return suggestions;
}