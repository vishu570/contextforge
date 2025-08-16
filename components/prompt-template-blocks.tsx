'use client';

import React, { useState, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus,
  X,
  Edit,
  Trash2,
  Copy,
  Search,
  Filter,
  Star,
  StarOff,
  Layers,
  Code2,
  FileText,
  MessageSquare,
  Settings,
  Workflow,
  Zap,
  Target,
  Brain,
  Book,
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  Info,
  Download,
  Upload,
  Bookmark,
  Tag,
  Clock,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { PromptVariable } from './prompt-variable-manager';

const templateBlockSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()),
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
    required: z.boolean(),
    description: z.string().optional(),
  })),
  isPublic: z.boolean(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
});

type TemplateBlockFormData = z.infer<typeof templateBlockSchema>;

export interface TemplateBlock extends TemplateBlockFormData {
  id: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  rating: number;
  isFavorite: boolean;
  version: number;
}

interface PromptTemplateBlocksProps {
  blocks: TemplateBlock[];
  onBlocksChange: (blocks: TemplateBlock[]) => void;
  onInsertBlock: (block: TemplateBlock) => void;
  onVariablesExtracted: (variables: PromptVariable[]) => void;
  readonly?: boolean;
  currentUserId?: string;
}

const BLOCK_CATEGORIES = [
  { value: 'system', label: 'System Instructions', icon: Settings, color: 'bg-blue-100 text-blue-800' },
  { value: 'context', label: 'Context Setting', icon: FileText, color: 'bg-green-100 text-green-800' },
  { value: 'task', label: 'Task Definition', icon: Target, color: 'bg-orange-100 text-orange-800' },
  { value: 'format', label: 'Output Format', icon: Code2, color: 'bg-purple-100 text-purple-800' },
  { value: 'reasoning', label: 'Reasoning', icon: Brain, color: 'bg-pink-100 text-pink-800' },
  { value: 'examples', label: 'Examples', icon: Book, color: 'bg-yellow-100 text-yellow-800' },
  { value: 'constraints', label: 'Constraints', icon: AlertTriangle, color: 'bg-red-100 text-red-800' },
  { value: 'conversation', label: 'Conversation', icon: MessageSquare, color: 'bg-indigo-100 text-indigo-800' },
  { value: 'workflow', label: 'Workflow', icon: Workflow, color: 'bg-teal-100 text-teal-800' },
  { value: 'optimization', label: 'Optimization', icon: Zap, color: 'bg-amber-100 text-amber-800' },
];

const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Beginner', color: 'bg-green-100 text-green-800' },
  { value: 'intermediate', label: 'Intermediate', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'advanced', label: 'Advanced', color: 'bg-orange-100 text-orange-800' },
  { value: 'expert', label: 'Expert', color: 'bg-red-100 text-red-800' },
];

const BUILTIN_BLOCKS: Omit<TemplateBlock, 'id' | 'authorId' | 'authorName' | 'createdAt' | 'updatedAt' | 'usageCount' | 'rating' | 'isFavorite' | 'version'>[] = [
  {
    name: 'System Role Definition',
    description: 'Define the AI assistant\'s role and personality',
    content: `You are {{role_name}}, a {{role_adjectives}} AI assistant specialized in {{domain}}.

Your key characteristics:
- {{characteristic_1}}
- {{characteristic_2}}  
- {{characteristic_3}}

You should always:
- {{behavior_1}}
- {{behavior_2}}
- {{behavior_3}}

When responding, maintain a {{tone}} tone and {{style}} communication style.`,
    category: 'system',
    tags: ['role', 'personality', 'system'],
    variables: [
      { name: 'role_name', type: 'string', required: true, description: 'Name of the role' },
      { name: 'role_adjectives', type: 'string', required: true, description: 'Adjectives describing the role' },
      { name: 'domain', type: 'string', required: true, description: 'Domain of expertise' },
      { name: 'characteristic_1', type: 'string', required: true, description: 'First key characteristic' },
      { name: 'characteristic_2', type: 'string', required: true, description: 'Second key characteristic' },
      { name: 'characteristic_3', type: 'string', required: true, description: 'Third key characteristic' },
      { name: 'behavior_1', type: 'string', required: true, description: 'First expected behavior' },
      { name: 'behavior_2', type: 'string', required: true, description: 'Second expected behavior' },
      { name: 'behavior_3', type: 'string', required: true, description: 'Third expected behavior' },
      { name: 'tone', type: 'string', required: true, description: 'Communication tone' },
      { name: 'style', type: 'string', required: true, description: 'Communication style' },
    ],
    isPublic: true,
    difficulty: 'beginner',
  },
  {
    name: 'Chain of Thought Reasoning',
    description: 'Enable step-by-step reasoning for complex problems',
    content: `When solving this problem, think step by step:

1. **Problem Analysis**: First, break down the problem into its core components:
   {{problem_components}}

2. **Information Gathering**: What information do we have and what do we need?
   Known: {{known_information}}
   Needed: {{needed_information}}

3. **Approach Selection**: Consider different approaches and select the most appropriate:
   {{approach_rationale}}

4. **Step-by-Step Solution**: Work through the solution systematically:
   {{solution_steps}}

5. **Verification**: Check your work and validate the result:
   {{verification_steps}}

6. **Final Answer**: Provide the complete solution with confidence level:
   {{final_answer}} (Confidence: {{confidence_level}})`,
    category: 'reasoning',
    tags: ['reasoning', 'step-by-step', 'analysis'],
    variables: [
      { name: 'problem_components', type: 'string', required: true, description: 'Key components of the problem' },
      { name: 'known_information', type: 'string', required: true, description: 'Information we already have' },
      { name: 'needed_information', type: 'string', required: true, description: 'Information we need to find' },
      { name: 'approach_rationale', type: 'string', required: true, description: 'Why this approach was chosen' },
      { name: 'solution_steps', type: 'string', required: true, description: 'Step-by-step solution process' },
      { name: 'verification_steps', type: 'string', required: true, description: 'How to verify the solution' },
      { name: 'final_answer', type: 'string', required: true, description: 'The complete final answer' },
      { name: 'confidence_level', type: 'string', required: false, description: 'Confidence level in the answer' },
    ],
    isPublic: true,
    difficulty: 'intermediate',
  },
  {
    name: 'JSON Output Format',
    description: 'Structure response as valid JSON with specific schema',
    content: `Please format your response as valid JSON with the following structure:

\`\`\`json
{
  {{json_schema}}
}
\`\`\`

Requirements:
- Ensure all JSON is valid and properly escaped
- Include all required fields: {{required_fields}}
- Use appropriate data types: {{field_types}}
- Follow naming convention: {{naming_convention}}
- Maximum nesting depth: {{max_depth}}

Example:
\`\`\`json
{{example_json}}
\`\`\``,
    category: 'format',
    tags: ['json', 'format', 'structure'],
    variables: [
      { name: 'json_schema', type: 'string', required: true, description: 'JSON schema definition' },
      { name: 'required_fields', type: 'string', required: true, description: 'List of required fields' },
      { name: 'field_types', type: 'string', required: true, description: 'Expected data types for fields' },
      { name: 'naming_convention', type: 'string', required: false, description: 'Field naming convention' },
      { name: 'max_depth', type: 'number', required: false, description: 'Maximum nesting depth' },
      { name: 'example_json', type: 'string', required: true, description: 'Example JSON output' },
    ],
    isPublic: true,
    difficulty: 'beginner',
  },
  {
    name: 'Few-Shot Learning Examples',
    description: 'Provide examples to guide the AI\'s responses',
    content: `Here are examples of the desired input-output format:

**Example 1:**
Input: {{example_1_input}}
Output: {{example_1_output}}

**Example 2:**
Input: {{example_2_input}}
Output: {{example_2_output}}

**Example 3:**
Input: {{example_3_input}}
Output: {{example_3_output}}

Pattern to follow:
- {{pattern_rule_1}}
- {{pattern_rule_2}}
- {{pattern_rule_3}}

Now, apply the same pattern to this input:
Input: {{actual_input}}
Output:`,
    category: 'examples',
    tags: ['examples', 'few-shot', 'learning'],
    variables: [
      { name: 'example_1_input', type: 'string', required: true, description: 'First example input' },
      { name: 'example_1_output', type: 'string', required: true, description: 'First example output' },
      { name: 'example_2_input', type: 'string', required: true, description: 'Second example input' },
      { name: 'example_2_output', type: 'string', required: true, description: 'Second example output' },
      { name: 'example_3_input', type: 'string', required: true, description: 'Third example input' },
      { name: 'example_3_output', type: 'string', required: true, description: 'Third example output' },
      { name: 'pattern_rule_1', type: 'string', required: true, description: 'First pattern rule' },
      { name: 'pattern_rule_2', type: 'string', required: true, description: 'Second pattern rule' },
      { name: 'pattern_rule_3', type: 'string', required: true, description: 'Third pattern rule' },
      { name: 'actual_input', type: 'string', required: true, description: 'The actual input to process' },
    ],
    isPublic: true,
    difficulty: 'intermediate',
  },
  {
    name: 'Quality Control Checklist',
    description: 'Ensure response quality with a validation checklist',
    content: `Before finalizing your response, verify it meets these quality criteria:

✅ **Accuracy**
- [ ] All facts are correct and verifiable
- [ ] Sources are cited where appropriate
- [ ] No contradictory statements

✅ **Completeness**
- [ ] All parts of the question are addressed
- [ ] Required elements are included: {{required_elements}}
- [ ] Nothing important is missing

✅ **Clarity**
- [ ] Language is clear and appropriate for {{target_audience}}
- [ ] Structure is logical and easy to follow
- [ ] Technical terms are explained when needed

✅ **Format**
- [ ] Follows the specified format: {{output_format}}
- [ ] Length is within limits: {{length_constraints}}
- [ ] Style matches requirements: {{style_requirements}}

✅ **Usefulness**
- [ ] Directly addresses the user's needs
- [ ] Provides actionable information
- [ ] Includes relevant examples or next steps

Only proceed if all criteria are met. If not, revise accordingly.`,
    category: 'constraints',
    tags: ['quality', 'checklist', 'validation'],
    variables: [
      { name: 'required_elements', type: 'string', required: true, description: 'List of required elements' },
      { name: 'target_audience', type: 'string', required: true, description: 'Target audience description' },
      { name: 'output_format', type: 'string', required: true, description: 'Expected output format' },
      { name: 'length_constraints', type: 'string', required: false, description: 'Length requirements' },
      { name: 'style_requirements', type: 'string', required: false, description: 'Style requirements' },
    ],
    isPublic: true,
    difficulty: 'advanced',
  },
];

export function PromptTemplateBlocks({
  blocks,
  onBlocksChange,
  onInsertBlock,
  onVariablesExtracted,
  readonly = false,
  currentUserId = 'current-user',
}: PromptTemplateBlocksProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TemplateBlock | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const form = useForm<TemplateBlockFormData>({
    resolver: zodResolver(templateBlockSchema),
    defaultValues: {
      name: '',
      description: '',
      content: '',
      category: '',
      tags: [],
      variables: [],
      isPublic: false,
      difficulty: 'beginner',
    },
  });

  // Combine built-in blocks with user blocks
  const allBlocks = useMemo(() => {
    const builtinWithIds: TemplateBlock[] = BUILTIN_BLOCKS.map((block, index) => ({
      ...block,
      id: `builtin-${index}`,
      authorId: 'system',
      authorName: 'System',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      usageCount: Math.floor(Math.random() * 1000) + 100,
      rating: 4 + Math.random(),
      isFavorite: false,
      version: 1,
    }));
    
    return [...builtinWithIds, ...blocks];
  }, [blocks]);

  // Filter and search blocks
  const filteredBlocks = useMemo(() => {
    return allBlocks.filter(block => {
      const matchesSearch = !searchTerm || 
        block.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        block.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        block.content.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !categoryFilter || block.category === categoryFilter;
      const matchesDifficulty = !difficultyFilter || block.difficulty === difficultyFilter;
      const matchesFavorites = !showFavoritesOnly || block.isFavorite;
      
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.every(tag => block.tags.includes(tag));
      
      return matchesSearch && matchesCategory && matchesDifficulty && matchesFavorites && matchesTags;
    });
  }, [allBlocks, searchTerm, categoryFilter, difficultyFilter, showFavoritesOnly, selectedTags]);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allBlocks.forEach(block => {
      block.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [allBlocks]);

  const extractVariablesFromContent = (content: string): PromptVariable[] => {
    const variableMatches = content.match(/{{\\s*([a-zA-Z_][a-zA-Z0-9_]*)\\s*}}/g) || [];
    const uniqueNames = [...new Set(variableMatches.map(match => match.replace(/[{}\\s]/g, '')))];
    
    return uniqueNames.map(name => ({
      id: Math.random().toString(36).substr(2, 9),
      name,
      type: 'string' as const,
      required: false,
      usage: [],
      lastModified: new Date().toISOString(),
    }));
  };

  const onSubmit = (data: TemplateBlockFormData) => {
    const newBlock: TemplateBlock = {
      ...data,
      id: editingBlock?.id || Math.random().toString(36).substr(2, 9),
      authorId: currentUserId,
      authorName: 'Current User',
      createdAt: editingBlock?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: editingBlock?.usageCount || 0,
      rating: editingBlock?.rating || 0,
      isFavorite: editingBlock?.isFavorite || false,
      version: editingBlock ? editingBlock.version + 1 : 1,
    };

    if (editingBlock) {
      const updatedBlocks = blocks.map(b => b.id === editingBlock.id ? newBlock : b);
      onBlocksChange(updatedBlocks);
      toast({
        title: 'Block updated',
        description: `Template block "${data.name}" has been updated.`,
      });
    } else {
      onBlocksChange([...blocks, newBlock]);
      toast({
        title: 'Block created',
        description: `Template block "${data.name}" has been created.`,
      });
    }

    form.reset();
    setEditingBlock(null);
    setShowCreateDialog(false);
  };

  const handleEdit = (block: TemplateBlock) => {
    if (block.authorId !== currentUserId && block.authorId !== 'system') {
      toast({
        title: 'Permission denied',
        description: 'You can only edit your own template blocks.',
        variant: 'destructive',
      });
      return;
    }

    setEditingBlock(block);
    form.reset(block);
    setShowCreateDialog(true);
  };

  const handleDelete = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    if (block.authorId !== currentUserId) {
      toast({
        title: 'Permission denied',
        description: 'You can only delete your own template blocks.',
        variant: 'destructive',
      });
      return;
    }

    const updatedBlocks = blocks.filter(b => b.id !== blockId);
    onBlocksChange(updatedBlocks);
    
    toast({
      title: 'Block deleted',
      description: `Template block "${block.name}" has been deleted.`,
    });
  };

  const handleClone = (block: TemplateBlock) => {
    const clonedBlock: TemplateBlock = {
      ...block,
      id: Math.random().toString(36).substr(2, 9),
      name: `${block.name} (Copy)`,
      authorId: currentUserId,
      authorName: 'Current User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      rating: 0,
      isFavorite: false,
      version: 1,
    };
    
    onBlocksChange([...blocks, clonedBlock]);
    toast({
      title: 'Block cloned',
      description: `Template block "${clonedBlock.name}" has been created.`,
    });
  };

  const handleToggleFavorite = (blockId: string) => {
    const updatedBlocks = allBlocks.map(block => {
      if (block.id === blockId) {
        const updated = { ...block, isFavorite: !block.isFavorite };
        return updated;
      }
      return block;
    });
    
    const userBlocks = updatedBlocks.filter(b => b.authorId !== 'system');
    onBlocksChange(userBlocks);
  };

  const handleInsertBlock = (block: TemplateBlock) => {
    // Extract variables and notify parent
    const extractedVariables = extractVariablesFromContent(block.content);
    if (extractedVariables.length > 0) {
      onVariablesExtracted(extractedVariables);
    }

    // Update usage count
    const updatedBlocks = allBlocks.map(b => 
      b.id === block.id ? { ...b, usageCount: b.usageCount + 1 } : b
    );
    const userBlocks = updatedBlocks.filter(b => b.authorId !== 'system');
    onBlocksChange(userBlocks);

    onInsertBlock(block);
    
    toast({
      title: 'Block inserted',
      description: `Template block "${block.name}" has been inserted into your prompt.`,
    });
  };

  const addTag = () => {
    if (newTag && !selectedTags.includes(newTag)) {
      setSelectedTags([...selectedTags, newTag]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  const getCategoryInfo = (category: string) => {
    return BLOCK_CATEGORIES.find(c => c.value === category) || BLOCK_CATEGORIES[0];
  };

  const getDifficultyInfo = (difficulty: string) => {
    return DIFFICULTY_LEVELS.find(d => d.value === difficulty) || DIFFICULTY_LEVELS[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Template Blocks</h3>
          <p className="text-sm text-muted-foreground">
            Reusable prompt components to speed up your workflow
          </p>
        </div>
        
        {!readonly && (
          <Button onClick={() => {
            setEditingBlock(null);
            form.reset();
            setShowCreateDialog(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Block
          </Button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search template blocks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All categories</SelectItem>
              {BLOCK_CATEGORIES.map(category => (
                <SelectItem key={category.value} value={category.value}>
                  <div className="flex items-center space-x-2">
                    <category.icon className="h-4 w-4" />
                    <span>{category.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All levels</SelectItem>
              {DIFFICULTY_LEVELS.map(level => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant={showFavoritesOnly ? "default" : "outline"}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <Star className="h-4 w-4 mr-1" />
            Favorites
          </Button>
        </div>

        {/* Tag filters */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedTags.map(tag => (
              <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                <span>{tag}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 hover:bg-transparent"
                  onClick={() => removeTag(tag)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Input
            placeholder="Filter by tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
            className="w-48"
          />
          <Button onClick={addTag} variant="outline" size="sm">
            Add Tag Filter
          </Button>
        </div>
      </div>

      {/* Blocks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBlocks.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  <Layers className="mx-auto h-12 w-12 mb-4" />
                  <p>No template blocks found</p>
                  <p className="text-sm">Try adjusting your search filters</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredBlocks.map((block) => {
            const categoryInfo = getCategoryInfo(block.category);
            const difficultyInfo = getDifficultyInfo(block.difficulty);
            
            return (
              <Card key={block.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm flex items-center space-x-2">
                        <categoryInfo.icon className="h-4 w-4" />
                        <span>{block.name}</span>
                      </CardTitle>
                      {block.description && (
                        <CardDescription className="text-xs mt-1">
                          {block.description}
                        </CardDescription>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleFavorite(block.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {block.isFavorite ? 
                        <Star className="h-4 w-4 fill-current text-yellow-500" /> : 
                        <StarOff className="h-4 w-4" />
                      }
                    </Button>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge className={categoryInfo.color} variant="secondary">
                      {categoryInfo.label}
                    </Badge>
                    <Badge className={difficultyInfo.color} variant="secondary">
                      {difficultyInfo.label}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-2">
                    {block.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {block.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{block.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="bg-muted p-2 rounded text-xs font-mono">
                    <pre className="whitespace-pre-wrap line-clamp-3">
                      {block.content.length > 120 
                        ? block.content.substring(0, 120) + '...' 
                        : block.content
                      }
                    </pre>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{block.usageCount} uses</span>
                      </span>
                      {block.authorId !== 'system' && (
                        <span>v{block.version}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 fill-current text-yellow-500" />
                      <span>{block.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      onClick={() => handleInsertBlock(block)}
                      size="sm"
                      className="flex-1"
                    >
                      Insert
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleClone(block)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    
                    {(block.authorId === currentUserId || block.authorId === 'system') && !readonly && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(block)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {block.authorId === currentUserId && !readonly && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(block.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBlock ? 'Edit Template Block' : 'Create Template Block'}
            </DialogTitle>
            <DialogDescription>
              Create a reusable template block for your prompts
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Block Name</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Descriptive name for the block"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={form.watch('category')}
                  onValueChange={(value) => form.setValue('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOCK_CATEGORIES.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        <div className="flex items-center space-x-2">
                          <category.icon className="h-4 w-4" />
                          <span>{category.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Brief description of what this block does"
                rows={2}
              />
            </div>
            
            <div>
              <Label htmlFor="content">Block Content</Label>
              <Textarea
                id="content"
                {...form.register('content')}
                placeholder="Template content with {{variables}}"
                rows={8}
                className="font-mono"
              />
              {form.formState.errors.content && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.content.message}
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select
                  value={form.watch('difficulty')}
                  onValueChange={(value: any) => form.setValue('difficulty', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_LEVELS.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2 mt-6">
                <input
                  type="checkbox"
                  id="isPublic"
                  {...form.register('isPublic')}
                  className="rounded"
                />
                <Label htmlFor="isPublic">Make this block public</Label>
              </div>
            </div>
            
            <div>
              <Label>Tags</Label>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {form.watch('tags').map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                      <span>{tag}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 hover:bg-transparent"
                        onClick={() => {
                          const currentTags = form.watch('tags');
                          form.setValue('tags', currentTags.filter(t => t !== tag));
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
                
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newTag && !form.watch('tags').includes(newTag)) {
                          form.setValue('tags', [...form.watch('tags'), newTag]);
                          setNewTag('');
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newTag && !form.watch('tags').includes(newTag)) {
                        form.setValue('tags', [...form.watch('tags'), newTag]);
                        setNewTag('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingBlock ? 'Update' : 'Create'} Block
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}