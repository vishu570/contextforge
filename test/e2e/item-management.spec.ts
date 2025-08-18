import { test, expect } from '@playwright/test';

test.describe('Item Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test.describe('Item Creation', () => {
    test('should create a new prompt item', async ({ page }) => {
      // Click create new item
      await page.click('[data-testid="quick-action-new-item"]');
      
      // Fill item form
      await page.fill('[data-testid="item-name"]', 'E2E Test Prompt');
      await page.fill('[data-testid="item-content"]', 'You are a helpful AI assistant. Please {action} the following: {content}');
      await page.selectOption('[data-testid="item-type"]', 'prompt');
      await page.selectOption('[data-testid="item-subtype"]', 'system');
      
      // Add tags
      await page.fill('[data-testid="tags-input"]', 'test,e2e,automation');
      
      // Set target models
      await page.check('[data-testid="model-openai"]');
      await page.check('[data-testid="model-anthropic"]');
      
      // Save item
      await page.click('[data-testid="save-item"]');
      
      // Verify success
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Item created successfully');
      
      // Verify item appears in list
      await page.goto('/dashboard/collections');
      await expect(page.locator('text="E2E Test Prompt"')).toBeVisible();
    });

    test('should create an agent item', async ({ page }) => {
      await page.click('[data-testid="quick-action-new-item"]');
      
      await page.fill('[data-testid="item-name"]', 'E2E Test Agent');
      await page.fill('[data-testid="item-content"]', 'You are an expert software engineer specializing in TypeScript and React. You help developers write clean, efficient code.');
      await page.selectOption('[data-testid="item-type"]', 'agent');
      await page.selectOption('[data-testid="item-subtype"]', 'specialist');
      
      // Add agent-specific settings
      await page.fill('[data-testid="agent-temperature"]', '0.7');
      await page.fill('[data-testid="agent-max-tokens"]', '2000');
      
      await page.click('[data-testid="save-item"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await page.click('[data-testid="quick-action-new-item"]');
      
      // Try to save without required fields
      await page.click('[data-testid="save-item"]');
      
      // Should show validation errors
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('text="Name is required"')).toBeVisible();
      await expect(page.locator('text="Content is required"')).toBeVisible();
    });

    test('should handle special characters in content', async ({ page }) => {
      await page.click('[data-testid="quick-action-new-item"]');
      
      const specialContent = `
        Special characters test: 
        - Emojis: 🚀 💡 ⚡ 
        - Unicode: ñáéíóú
        - Symbols: @#$%^&*()
        - Code: \`console.log("Hello");\`
        - JSON: {"key": "value", "number": 123}
        - Markdown: **bold** *italic* \`code\`
      `;
      
      await page.fill('[data-testid="item-name"]', 'Special Characters Test');
      await page.fill('[data-testid="item-content"]', specialContent);
      await page.selectOption('[data-testid="item-type"]', 'template');
      
      await page.click('[data-testid="save-item"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });
  });

  test.describe('Item Editing', () => {
    test('should edit an existing item', async ({ page }) => {
      // First create an item to edit
      await page.click('[data-testid="quick-action-new-item"]');
      await page.fill('[data-testid="item-name"]', 'Item to Edit');
      await page.fill('[data-testid="item-content"]', 'Original content');
      await page.selectOption('[data-testid="item-type"]', 'prompt');
      await page.click('[data-testid="save-item"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // Navigate to collections and find the item
      await page.goto('/dashboard/collections');
      await page.click('text="Item to Edit"');
      
      // Click edit button
      await page.click('[data-testid="edit-item"]');
      
      // Modify the item
      await page.fill('[data-testid="item-name"]', 'Edited Item Name');
      await page.fill('[data-testid="item-content"]', 'Updated content with new information');
      
      // Save changes
      await page.click('[data-testid="save-changes"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('text="Edited Item Name"')).toBeVisible();
    });

    test('should support version history', async ({ page }) => {
      // Create and edit an item multiple times
      await page.click('[data-testid="quick-action-new-item"]');
      await page.fill('[data-testid="item-name"]', 'Versioned Item');
      await page.fill('[data-testid="item-content"]', 'Version 1 content');
      await page.selectOption('[data-testid="item-type"]', 'prompt');
      await page.click('[data-testid="save-item"]');
      
      // Edit version 2
      await page.goto('/dashboard/collections');
      await page.click('text="Versioned Item"');
      await page.click('[data-testid="edit-item"]');
      await page.fill('[data-testid="item-content"]', 'Version 2 content');
      await page.click('[data-testid="save-changes"]');
      
      // Edit version 3
      await page.click('[data-testid="edit-item"]');
      await page.fill('[data-testid="item-content"]', 'Version 3 content');
      await page.click('[data-testid="save-changes"]');
      
      // Check version history
      await page.click('[data-testid="version-history"]');
      
      const versionList = page.locator('[data-testid="version-item"]');
      await expect(versionList).toHaveCount(3);
      
      // Restore previous version
      await page.click('[data-testid="restore-version"]:nth-child(2)');
      await expect(page.locator('[data-testid="item-content"]')).toContainText('Version 2 content');
    });
  });

  test.describe('Item Organization', () => {
    test('should move items between folders', async ({ page }) => {
      // Create a folder first
      await page.goto('/dashboard/collections');
      await page.click('[data-testid="create-folder"]');
      await page.fill('[data-testid="folder-name"]', 'E2E Test Folder');
      await page.click('[data-testid="save-folder"]');
      
      // Create an item
      await page.click('[data-testid="quick-action-new-item"]');
      await page.fill('[data-testid="item-name"]', 'Item to Move');
      await page.fill('[data-testid="item-content"]', 'Content to move');
      await page.selectOption('[data-testid="item-type"]', 'prompt');
      await page.click('[data-testid="save-item"]');
      
      // Move item to folder
      await page.goto('/dashboard/collections');
      await page.click('[data-testid="item-menu"]:has-text("Item to Move")');
      await page.click('[data-testid="move-item"]');
      await page.selectOption('[data-testid="destination-folder"]', 'E2E Test Folder');
      await page.click('[data-testid="confirm-move"]');
      
      // Verify item is in the folder
      await page.click('text="E2E Test Folder"');
      await expect(page.locator('text="Item to Move"')).toBeVisible();
    });

    test('should support bulk operations', async ({ page }) => {
      // Create multiple items
      const itemNames = ['Bulk Item 1', 'Bulk Item 2', 'Bulk Item 3'];
      
      for (const name of itemNames) {
        await page.click('[data-testid="quick-action-new-item"]');
        await page.fill('[data-testid="item-name"]', name);
        await page.fill('[data-testid="item-content"]', `Content for ${name}`);
        await page.selectOption('[data-testid="item-type"]', 'prompt');
        await page.click('[data-testid="save-item"]');
        await page.waitForSelector('[data-testid="success-message"]');
      }
      
      // Navigate to collections and select multiple items
      await page.goto('/dashboard/collections');
      
      for (const name of itemNames) {
        await page.check(`[data-testid="select-item"]:near(:text("${name}"))`);
      }
      
      // Verify bulk actions are available
      await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();
      
      // Test bulk delete
      await page.click('[data-testid="bulk-delete"]');
      await page.click('[data-testid="confirm-bulk-delete"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // Verify items are deleted
      for (const name of itemNames) {
        await expect(page.locator(`text="${name}"`)).not.toBeVisible();
      }
    });

    test('should support tagging and filtering', async ({ page }) => {
      // Create items with different tags
      const items = [
        { name: 'Marketing Prompt', tags: 'marketing,sales,customer' },
        { name: 'Technical Prompt', tags: 'technical,development,code' },
        { name: 'General Prompt', tags: 'general,versatile' },
      ];
      
      for (const item of items) {
        await page.click('[data-testid="quick-action-new-item"]');
        await page.fill('[data-testid="item-name"]', item.name);
        await page.fill('[data-testid="item-content"]', `Content for ${item.name}`);
        await page.fill('[data-testid="tags-input"]', item.tags);
        await page.selectOption('[data-testid="item-type"]', 'prompt');
        await page.click('[data-testid="save-item"]');
        await page.waitForSelector('[data-testid="success-message"]');
      }
      
      // Navigate to collections and test filtering
      await page.goto('/dashboard/collections');
      
      // Filter by tag
      await page.click('[data-testid="filter-by-tag"]');
      await page.click('text="marketing"');
      
      await expect(page.locator('text="Marketing Prompt"')).toBeVisible();
      await expect(page.locator('text="Technical Prompt"')).not.toBeVisible();
      
      // Clear filter
      await page.click('[data-testid="clear-filters"]');
      
      // Test search
      await page.fill('[data-testid="search-input"]', 'technical');
      await page.keyboard.press('Enter');
      
      await expect(page.locator('text="Technical Prompt"')).toBeVisible();
      await expect(page.locator('text="Marketing Prompt"')).not.toBeVisible();
    });
  });

  test.describe('Item Optimization', () => {
    test('should optimize a prompt for different models', async ({ page }) => {
      // Create a prompt to optimize
      await page.click('[data-testid="quick-action-new-item"]');
      await page.fill('[data-testid="item-name"]', 'Prompt to Optimize');
      await page.fill('[data-testid="item-content"]', 'Please write a summary of the text provided by the user.');
      await page.selectOption('[data-testid="item-type"]', 'prompt');
      await page.click('[data-testid="save-item"]');
      
      // Navigate to the item and optimize
      await page.goto('/dashboard/collections');
      await page.click('text="Prompt to Optimize"');
      await page.click('[data-testid="optimize-item"]');
      
      // Select optimization targets
      await page.check('[data-testid="optimize-for-openai"]');
      await page.check('[data-testid="optimize-for-anthropic"]');
      
      // Start optimization
      await page.click('[data-testid="start-optimization"]');
      
      // Wait for optimization to complete
      await expect(page.locator('[data-testid="optimization-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="optimization-complete"]')).toBeVisible({ timeout: 30000 });
      
      // Verify optimization results
      await expect(page.locator('[data-testid="optimization-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="optimized-content"]')).toBeVisible();
      
      // Accept optimization
      await page.click('[data-testid="accept-optimization"]');
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should compare optimization results', async ({ page }) => {
      // Create and optimize an item
      await page.click('[data-testid="quick-action-new-item"]');
      await page.fill('[data-testid="item-name"]', 'Comparison Test');
      await page.fill('[data-testid="item-content"]', 'Generate a creative story about space exploration.');
      await page.selectOption('[data-testid="item-type"]', 'prompt');
      await page.click('[data-testid="save-item"]');
      
      await page.goto('/dashboard/collections');
      await page.click('text="Comparison Test"');
      await page.click('[data-testid="optimize-item"]');
      
      await page.check('[data-testid="optimize-for-openai"]');
      await page.check('[data-testid="optimize-for-anthropic"]');
      await page.click('[data-testid="start-optimization"]');
      
      // Wait for completion
      await expect(page.locator('[data-testid="optimization-complete"]')).toBeVisible({ timeout: 30000 });
      
      // Compare results
      await page.click('[data-testid="compare-optimizations"]');
      
      // Should show side-by-side comparison
      await expect(page.locator('[data-testid="original-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="openai-optimization"]')).toBeVisible();
      await expect(page.locator('[data-testid="anthropic-optimization"]')).toBeVisible();
      
      // Should show metrics comparison
      await expect(page.locator('[data-testid="metrics-comparison"]')).toBeVisible();
      await expect(page.locator('[data-testid="token-reduction"]')).toBeVisible();
      await expect(page.locator('[data-testid="clarity-score"]')).toBeVisible();
    });
  });

  test.describe('Item Sharing', () => {
    test('should create and access shared links', async ({ page }) => {
      // Create an item to share
      await page.click('[data-testid="quick-action-new-item"]');
      await page.fill('[data-testid="item-name"]', 'Shared Item');
      await page.fill('[data-testid="item-content"]', 'This item will be shared publicly.');
      await page.selectOption('[data-testid="item-type"]', 'template');
      await page.click('[data-testid="save-item"]');
      
      // Navigate to the item and share it
      await page.goto('/dashboard/collections');
      await page.click('text="Shared Item"');
      await page.click('[data-testid="share-item"]');
      
      // Configure sharing settings
      await page.check('[data-testid="enable-public-sharing"]');
      await page.selectOption('[data-testid="share-permissions"]', 'view');
      
      // Generate share link
      await page.click('[data-testid="generate-share-link"]');
      
      // Copy the share link
      const shareLink = await page.locator('[data-testid="share-link"]').textContent();
      expect(shareLink).toContain('/shared/');
      
      // Test the share link in a new incognito context
      const incognitoContext = await page.context().browser()?.newContext();
      const incognitoPage = await incognitoContext?.newPage();
      
      if (incognitoPage && shareLink) {
        await incognitoPage.goto(shareLink);
        
        // Should be able to view the shared item without authentication
        await expect(incognitoPage.locator('h1')).toContainText('Shared Item');
        await expect(incognitoPage.locator('[data-testid="shared-content"]')).toContainText('This item will be shared publicly.');
        
        // Should not be able to edit
        await expect(incognitoPage.locator('[data-testid="edit-item"]')).not.toBeVisible();
        
        await incognitoContext?.close();
      }
    });

    test('should manage sharing permissions', async ({ page }) => {
      // Create and share an item
      await page.click('[data-testid="quick-action-new-item"]');
      await page.fill('[data-testid="item-name"]', 'Permission Test');
      await page.fill('[data-testid="item-content"]', 'Testing sharing permissions.');
      await page.selectOption('[data-testid="item-type"]', 'prompt');
      await page.click('[data-testid="save-item"]');
      
      await page.goto('/dashboard/collections');
      await page.click('text="Permission Test"');
      await page.click('[data-testid="share-item"]');
      
      // Test different permission levels
      await page.check('[data-testid="enable-public-sharing"]');
      await page.selectOption('[data-testid="share-permissions"]', 'edit');
      await page.click('[data-testid="update-sharing"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // Revoke sharing
      await page.uncheck('[data-testid="enable-public-sharing"]');
      await page.click('[data-testid="update-sharing"]');
      
      // Share link should be deactivated
      const shareLink = await page.locator('[data-testid="share-link"]').textContent();
      expect(shareLink).toContain('Sharing disabled');
    });
  });

  test.describe('Item Analytics', () => {
    test('should track item usage analytics', async ({ page }) => {
      // Create an item
      await page.click('[data-testid="quick-action-new-item"]');
      await page.fill('[data-testid="item-name"]', 'Analytics Test Item');
      await page.fill('[data-testid="item-content"]', 'Content for analytics testing.');
      await page.selectOption('[data-testid="item-type"]', 'prompt');
      await page.click('[data-testid="save-item"]');
      
      // View the item multiple times to generate analytics
      await page.goto('/dashboard/collections');
      for (let i = 0; i < 3; i++) {
        await page.click('text="Analytics Test Item"');
        await page.waitForTimeout(1000);
        await page.goBack();
      }
      
      // Check analytics
      await page.click('text="Analytics Test Item"');
      await page.click('[data-testid="view-analytics"]');
      
      await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="view-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="usage-chart"]')).toBeVisible();
    });
  });
});