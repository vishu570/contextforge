import matter from 'gray-matter';
import yaml from 'yaml';
import xml2js from 'xml2js';
import Papa from 'papaparse';

export interface ParsedItem {
  name: string;
  content: string;
  type: 'prompt' | 'agent' | 'rule' | 'template' | 'snippet' | 'other';
  format: string;
  metadata: Record<string, any>;
  author?: string;
  language?: string;
  targetModels?: string;
}

export async function parseFile(
  filename: string,
  content: string
): Promise<ParsedItem[]> {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const items: ParsedItem[] = [];

  try {
    switch (extension) {
      case 'md':
      case 'markdown':
        items.push(...await parseMarkdown(filename, content));
        break;
      
      case 'mdc':
        items.push(...await parseMdc(filename, content));
        break;
      
      case 'json':
        items.push(...await parseJson(filename, content));
        break;
      
      case 'yaml':
      case 'yml':
        items.push(...await parseYaml(filename, content));
        break;
      
      case 'xml':
        items.push(...await parseXml(filename, content));
        break;
      
      case 'prompt':
        items.push({
          name: filename.replace(/\.[^/.]+$/, ''),
          content,
          type: 'prompt',
          format: extension,
          metadata: {},
        });
        break;
      
      case 'agent':
        items.push({
          name: filename.replace(/\.[^/.]+$/, ''),
          content,
          type: 'agent',
          format: extension,
          metadata: {},
        });
        break;
      
      case 'af':
        items.push(...await parseAgentFile(filename, content));
        break;
      
      case 'csv':
        items.push(...await parseCsv(filename, content));
        break;
      
      default:
        // Try to detect type from content
        const detectedType = detectTypeFromContent(content);
        items.push({
          name: filename.replace(/\.[^/.]+$/, ''),
          content,
          type: detectedType,
          format: extension || 'txt',
          metadata: {},
        });
    }
  } catch (error) {
    console.error(`Error parsing file ${filename}:`, error);
    // Return as raw content if parsing fails
    items.push({
      name: filename.replace(/\.[^/.]+$/, ''),
      content,
      type: 'other',
      format: extension || 'txt',
      metadata: { parseError: true },
    });
  }

  return items;
}

async function parseMarkdown(filename: string, content: string): Promise<ParsedItem[]> {
  const items: ParsedItem[] = [];
  const parsed = matter(content);
  
  // Check if it has front matter
  if (Object.keys(parsed.data).length > 0) {
    const type = detectTypeFromMetadata(parsed.data) || detectTypeFromContent(parsed.content);
    
    items.push({
      name: parsed.data.name || parsed.data.title || filename.replace(/\.[^/.]+$/, ''),
      content: parsed.content,
      type,
      format: 'md',
      metadata: parsed.data,
      author: parsed.data.author,
      language: parsed.data.language,
      targetModels: parsed.data.targetModels || parsed.data.models,
    });
  } else {
    // Extract code blocks as separate items
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const codeBlocks: Array<{ lang?: string; content: string }> = [];
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      codeBlocks.push({
        lang: match[1],
        content: match[2],
      });
    }
    
    if (codeBlocks.length > 0) {
      codeBlocks.forEach((block, index) => {
        const type = detectTypeFromContent(block.content);
        items.push({
          name: `${filename.replace(/\.[^/.]+$/, '')}_block_${index + 1}`,
          content: block.content,
          type,
          format: 'md',
          metadata: { language: block.lang },
          language: block.lang,
        });
      });
    }
    
    // Add the full document as well
    items.push({
      name: filename.replace(/\.[^/.]+$/, ''),
      content,
      type: detectTypeFromContent(content),
      format: 'md',
      metadata: {},
    });
  }
  
  return items;
}

async function parseMdc(filename: string, content: string): Promise<ParsedItem[]> {
  // Cursor .mdc files have YAML front matter
  const parsed = matter(content);
  
  return [{
    name: parsed.data.name || parsed.data.title || filename.replace(/\.[^/.]+$/, ''),
    content: parsed.content || content,
    type: 'rule', // .mdc files are typically Cursor rules
    format: 'mdc',
    metadata: {
      ...parsed.data,
      description: parsed.data.description,
      globs: parsed.data.globs,
      alwaysApply: parsed.data.alwaysApply,
    },
    author: parsed.data.author,
  }];
}

async function parseJson(filename: string, content: string): Promise<ParsedItem[]> {
  const items: ParsedItem[] = [];
  const data = JSON.parse(content);
  
  if (Array.isArray(data)) {
    // Handle array of items
    data.forEach((item, index) => {
      items.push({
        name: item.name || item.title || `${filename.replace(/\.[^/.]+$/, '')}_${index + 1}`,
        content: item.content || item.prompt || JSON.stringify(item, null, 2),
        type: detectTypeFromMetadata(item) || 'other',
        format: 'json',
        metadata: item,
        author: item.author,
        language: item.language,
        targetModels: item.targetModels || item.models,
      });
    });
  } else {
    // Single item
    items.push({
      name: data.name || data.title || filename.replace(/\.[^/.]+$/, ''),
      content: data.content || data.prompt || JSON.stringify(data, null, 2),
      type: detectTypeFromMetadata(data) || 'other',
      format: 'json',
      metadata: data,
      author: data.author,
      language: data.language,
      targetModels: data.targetModels || data.models,
    });
  }
  
  return items;
}

async function parseYaml(filename: string, content: string): Promise<ParsedItem[]> {
  const items: ParsedItem[] = [];
  const data = yaml.parse(content);
  
  if (Array.isArray(data)) {
    // Handle array of items
    data.forEach((item, index) => {
      items.push({
        name: item.name || item.title || `${filename.replace(/\.[^/.]+$/, '')}_${index + 1}`,
        content: item.content || item.prompt || yaml.stringify(item),
        type: detectTypeFromMetadata(item) || 'other',
        format: 'yaml',
        metadata: item,
        author: item.author,
        language: item.language,
        targetModels: item.targetModels || item.models,
      });
    });
  } else {
    // Single item
    items.push({
      name: data.name || data.title || filename.replace(/\.[^/.]+$/, ''),
      content: data.content || data.prompt || yaml.stringify(data),
      type: detectTypeFromMetadata(data) || 'other',
      format: 'yaml',
      metadata: data,
      author: data.author,
      language: data.language,
      targetModels: data.targetModels || data.models,
    });
  }
  
  return items;
}

async function parseXml(filename: string, content: string): Promise<ParsedItem[]> {
  const items: ParsedItem[] = [];
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(content);
  
  // Traverse XML structure to find items
  const extractItems = (obj: any, prefix = ''): void => {
    if (obj.prompts?.prompt) {
      const prompts = Array.isArray(obj.prompts.prompt) ? obj.prompts.prompt : [obj.prompts.prompt];
      prompts.forEach((prompt: any, index: number) => {
        items.push({
          name: prompt.$.name || prompt.$.title || `${filename}_prompt_${index + 1}`,
          content: prompt._ || prompt.content?.[0] || JSON.stringify(prompt),
          type: 'prompt',
          format: 'xml',
          metadata: prompt.$,
        });
      });
    }
    
    if (obj.agents?.agent) {
      const agents = Array.isArray(obj.agents.agent) ? obj.agents.agent : [obj.agents.agent];
      agents.forEach((agent: any, index: number) => {
        items.push({
          name: agent.$.name || agent.$.title || `${filename}_agent_${index + 1}`,
          content: agent._ || agent.content?.[0] || JSON.stringify(agent),
          type: 'agent',
          format: 'xml',
          metadata: agent.$,
        });
      });
    }
    
    // Recursively search for nested structures
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        extractItems(obj[key], `${prefix}${key}.`);
      }
    });
  };
  
  extractItems(result);
  
  // If no specific items found, add the whole content
  if (items.length === 0) {
    items.push({
      name: filename.replace(/\.[^/.]+$/, ''),
      content,
      type: 'other',
      format: 'xml',
      metadata: result,
    });
  }
  
  return items;
}

async function parseAgentFile(filename: string, content: string): Promise<ParsedItem[]> {
  // .af files are typically agent definition files
  const lines = content.split('\n');
  const metadata: Record<string, any> = {};
  let mainContent = content;
  
  // Look for metadata in comments or special syntax
  lines.forEach(line => {
    if (line.startsWith('#') || line.startsWith('//')) {
      const match = line.match(/^[#/]+\s*(\w+):\s*(.+)$/);
      if (match) {
        metadata[match[1]] = match[2];
      }
    }
  });
  
  return [{
    name: metadata.name || filename.replace(/\.[^/.]+$/, ''),
    content: mainContent,
    type: 'agent',
    format: 'af',
    metadata,
    author: metadata.author,
    targetModels: metadata.models || metadata.targetModels,
  }];
}

function detectTypeFromContent(content: string): ParsedItem['type'] {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('agent') || lowerContent.includes('assistant')) {
    return 'agent';
  }
  if (lowerContent.includes('prompt') || lowerContent.includes('instruction')) {
    return 'prompt';
  }
  if (lowerContent.includes('rule') || lowerContent.includes('glob') || lowerContent.includes('eslint')) {
    return 'rule';
  }
  if (lowerContent.includes('template') || lowerContent.includes('boilerplate')) {
    return 'template';
  }
  if (lowerContent.includes('snippet') || lowerContent.includes('function') || lowerContent.includes('const')) {
    return 'snippet';
  }
  
  return 'other';
}

function detectTypeFromMetadata(metadata: Record<string, any>): ParsedItem['type'] | null {
  if (metadata.type) {
    const type = metadata.type.toLowerCase();
    if (['prompt', 'agent', 'rule', 'template', 'snippet'].includes(type)) {
      return type as ParsedItem['type'];
    }
  }
  
  if (metadata.category) {
    const category = metadata.category.toLowerCase();
    if (category.includes('prompt')) return 'prompt';
    if (category.includes('agent')) return 'agent';
    if (category.includes('rule')) return 'rule';
    if (category.includes('template')) return 'template';
    if (category.includes('snippet')) return 'snippet';
  }
  
  return null;
}

// CSV Parser for bulk imports
async function parseCsv(filename: string, content: string): Promise<ParsedItem[]> {
  const items: ParsedItem[] = [];
  
  try {
    const parsed = Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      transform: (value: string) => value.trim(),
    });

    if (parsed.errors.length > 0) {
      console.warn('CSV parsing warnings:', parsed.errors);
    }

    parsed.data.forEach((row: any, index: number) => {
      try {
        // Smart field mapping for common CSV formats
        const mappedData = smartMapCsvFields(row);
        
        if (!mappedData.content && !mappedData.name) {
          console.warn(`Skipping empty row ${index + 1} in ${filename}`);
          return;
        }

        const item: ParsedItem = {
          name: mappedData.name || `${filename}_row_${index + 1}`,
          content: mappedData.content || JSON.stringify(row),
          type: mappedData.type || detectTypeFromContent(mappedData.content || ''),
          format: 'csv',
          metadata: {
            ...mappedData.metadata,
            csvRow: index + 1,
            originalRow: row,
          },
          author: mappedData.author,
          language: mappedData.language,
          targetModels: mappedData.targetModels,
        };

        items.push(item);
      } catch (error) {
        console.error(`Error processing CSV row ${index + 1}:`, error);
        // Add as raw data for manual review
        items.push({
          name: `${filename}_error_row_${index + 1}`,
          content: JSON.stringify(row),
          type: 'other',
          format: 'csv',
          metadata: {
            parseError: true,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            csvRow: index + 1,
          },
        });
      }
    });
  } catch (error) {
    console.error(`Error parsing CSV file ${filename}:`, error);
    throw error;
  }

  return items;
}

// Smart CSV field mapping
function smartMapCsvFields(row: Record<string, any>): {
  name?: string;
  content?: string;
  type?: ParsedItem['type'];
  author?: string;
  language?: string;
  targetModels?: string;
  metadata: Record<string, any>;
} {
  const keys = Object.keys(row).map(k => k.toLowerCase());
  const result: any = { metadata: {} };

  // Common field mappings
  const fieldMappings = {
    name: ['name', 'title', 'prompt_name', 'agent_name', 'rule_name', 'identifier'],
    content: ['content', 'text', 'prompt', 'body', 'description', 'rule', 'agent_content'],
    type: ['type', 'category', 'kind', 'classification'],
    author: ['author', 'creator', 'owner', 'by'],
    language: ['language', 'lang', 'programming_language'],
    targetModels: ['models', 'target_models', 'ai_models', 'compatible_models'],
  };

  // Map fields based on common patterns
  for (const [targetField, possibleKeys] of Object.entries(fieldMappings)) {
    for (const key of possibleKeys) {
      const matchingKey = keys.find(k => k.includes(key));
      if (matchingKey && row[matchingKey]) {
        result[targetField] = row[matchingKey];
        break;
      }
    }
  }

  // Store unmapped fields as metadata
  for (const [key, value] of Object.entries(row)) {
    const isUsed = Object.values(result).includes(value);
    if (!isUsed && value !== null && value !== undefined && value !== '') {
      result.metadata[key] = value;
    }
  }

  return result;
}

// Enhanced type detection with machine learning patterns
export function detectTypeFromContentAdvanced(content: string, metadata?: Record<string, any>): {
  type: ParsedItem['type'];
  confidence: number;
  reasons: string[];
} {
  const lowerContent = content.toLowerCase();
  const reasons: string[] = [];
  let type: ParsedItem['type'] = 'other';
  let confidence = 0;

  // Enhanced pattern matching with confidence scoring
  const patterns = [
    {
      type: 'prompt' as const,
      patterns: [
        /you are|act as|your role|system:|user:|assistant:/i,
        /instruction|prompt|request|query/i,
        /please|help|explain|generate|create/i,
      ],
      weight: 0.8,
    },
    {
      type: 'agent' as const,
      patterns: [
        /agent|assistant|bot|ai model/i,
        /personality|behavior|capabilities/i,
        /interact|respond|engage/i,
      ],
      weight: 0.7,
    },
    {
      type: 'rule' as const,
      patterns: [
        /rule|policy|guideline|constraint/i,
        /must|should|required|forbidden/i,
        /eslint|lint|format|glob/i,
      ],
      weight: 0.6,
    },
    {
      type: 'template' as const,
      patterns: [
        /template|boilerplate|scaffold/i,
        /\{\{|\$\{|<%|%>/,
        /placeholder|variable|parameter/i,
      ],
      weight: 0.5,
    },
    {
      type: 'snippet' as const,
      patterns: [
        /function|const|var|let|def|class/i,
        /import|export|require|module/i,
        /\(.*\)|\{.*\}|\[.*\]/,
      ],
      weight: 0.4,
    },
  ];

  // Check metadata hints
  if (metadata) {
    const metadataType = detectTypeFromMetadata(metadata);
    if (metadataType) {
      type = metadataType;
      confidence += 0.3;
      reasons.push('Detected from metadata');
    }
  }

  // Pattern matching with confidence calculation
  let maxScore = 0;
  let detectedType: ParsedItem['type'] = 'other';
  
  for (const pattern of patterns) {
    let score = 0;
    const matchedPatterns: string[] = [];
    
    for (const regex of pattern.patterns) {
      if (regex.test(content)) {
        score += pattern.weight / pattern.patterns.length;
        matchedPatterns.push(regex.toString());
      }
    }
    
    if (score > maxScore) {
      maxScore = score;
      detectedType = pattern.type;
      if (matchedPatterns.length > 0) {
        reasons.push(`Matched ${pattern.type} patterns: ${matchedPatterns.length}`);
      }
    }
  }

  if (maxScore > confidence) {
    type = detectedType;
    confidence = Math.min(maxScore + confidence, 1);
  }

  return { type, confidence, reasons };
}

// Smart duplicate detection
export function calculateContentSimilarity(content1: string, content2: string): {
  similarity: number;
  method: string;
  details: Record<string, any>;
} {
  // Normalize content
  const normalize = (text: string) => {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();
  };

  const norm1 = normalize(content1);
  const norm2 = normalize(content2);

  // Exact match
  if (norm1 === norm2) {
    return { similarity: 1.0, method: 'exact', details: { length: norm1.length } };
  }

  // Levenshtein distance for short content
  if (norm1.length < 500 && norm2.length < 500) {
    const distance = levenshteinDistance(norm1, norm2);
    const maxLen = Math.max(norm1.length, norm2.length);
    const similarity = 1 - (distance / maxLen);
    return { 
      similarity, 
      method: 'levenshtein', 
      details: { distance, maxLength: maxLen } 
    };
  }

  // Jaccard similarity for longer content
  const words1 = new Set(norm1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(norm2.split(' ').filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  const similarity = union.size > 0 ? intersection.size / union.size : 0;
  
  return {
    similarity,
    method: 'jaccard',
    details: {
      intersection: intersection.size,
      union: union.size,
      words1: words1.size,
      words2: words2.size,
    },
  };
}

// Levenshtein distance implementation
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  const n = str1.length;
  const m = str2.length;

  if (n === 0) return m;
  if (m === 0) return n;

  for (let i = 0; i <= m; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= n; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[m][n];
}