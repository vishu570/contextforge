import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '@/components/theme-provider';

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockItem = (overrides = {}) => ({
  id: 'item-123',
  name: 'Test Item',
  content: 'Test content for the item',
  type: 'prompt',
  subType: 'system',
  format: 'text',
  userId: 'user-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: [],
  targetModels: 'openai,anthropic',
  ...overrides,
});

export const createMockFolder = (overrides = {}) => ({
  id: 'folder-123',
  name: 'Test Folder',
  description: 'Test folder description',
  userId: 'user-123',
  parentId: null,
  isShared: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockJob = (overrides = {}) => ({
  id: 'job-123',
  type: 'OPTIMIZATION',
  priority: 'NORMAL',
  status: 'pending',
  data: {},
  progress: 0,
  result: null,
  error: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'user-123',
  ...overrides,
});

export const createMockOptimization = (overrides = {}) => ({
  id: 'opt-123',
  itemId: 'item-123',
  originalContent: 'Original content',
  optimizedContent: 'Optimized content',
  targetModel: 'openai',
  improvementRatio: 0.85,
  metrics: {
    tokenCount: 100,
    estimatedCost: 0.002,
    qualityScore: 0.9,
  },
  createdAt: new Date(),
  ...overrides,
});

// Utility functions for testing
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApiResponse = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
};

export const mockApiError = (message: string, status = 500) => {
  return Promise.reject(new Error(message));
};