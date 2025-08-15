import matter from 'gray-matter';
import yaml from 'yaml';
import xml2js from 'xml2js';

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