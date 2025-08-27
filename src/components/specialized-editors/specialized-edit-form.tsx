'use client';

import React from 'react';
import { Item, Tool, LLMModel } from '@/src/types/improved-architecture';

// Specialized editors
import { PromptEditor } from './prompt-editor';
import { AgentEditor } from './agent-editor';
import { RuleEditor } from './rule-editor';

// Fallback to generic editor for other types
import { EditItemForm } from '@/components/edit-item-form';

interface SpecializedEditFormProps {
  item: Item;
  availableTags?: any[];
  availableTools?: Tool[];
  availableModels?: LLMModel[];
  existingRules?: any[];
  type: string;
  userId: string;
  onSave?: (data: any) => Promise<void>;
  onTest?: (testConfig: any) => Promise<any>;
  onOptimize?: (model: LLMModel) => Promise<void>;
  readonly?: boolean;
}

/**
 * SpecializedEditForm - Routes to the appropriate specialized editor based on item type
 * 
 * This component acts as a smart router that:
 * 1. Analyzes the item type
 * 2. Loads the appropriate specialized editor with type-specific features
 * 3. Falls back to the generic EditItemForm for unsupported types
 */
export function SpecializedEditForm({
  item,
  availableTags = [],
  availableTools = [],
  availableModels = [],
  existingRules = [],
  type,
  userId,
  onSave,
  onTest,
  onOptimize,
  readonly = false
}: SpecializedEditFormProps) {
  
  // Default handlers if not provided
  const handleSave = onSave || (async (data: any) => {
    console.log('Save not implemented for this form type');
  });

  const handleTest = onTest || (async (testConfig: any) => {
    console.log('Test not implemented for this form type');
    return { success: true, message: 'Test completed' };
  });

  const handleOptimize = onOptimize || (async (model: LLMModel) => {
    console.log('Optimize not implemented for this form type');
  });

  // Route to appropriate specialized editor based on item type
  switch (item.type?.toLowerCase()) {
    case 'prompt':
      return (
        <PromptEditor
          item={item}
          availableModels={availableModels}
          onSave={handleSave}
          onTest={handleTest}
          onOptimize={handleOptimize}
          readonly={readonly}
        />
      );

    case 'agent':
      return (
        <AgentEditor
          item={item}
          availableTools={availableTools}
          onSave={handleSave}
          onTest={handleTest}
          readonly={readonly}
        />
      );

    case 'rule':
      return (
        <RuleEditor
          item={item}
          existingRules={existingRules}
          onSave={handleSave}
          onTest={handleTest}
          readonly={readonly}
        />
      );

    // For templates, snippets, and other types, fall back to generic form
    default:
      return (
        <EditItemForm
          item={item}
          availableTags={availableTags}
          type={type}
          userId={userId}
        />
      );
  }
}

// Export individual editors for direct use if needed
export { PromptEditor, AgentEditor, RuleEditor };