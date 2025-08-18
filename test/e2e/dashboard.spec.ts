import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Use the authenticated state from global setup
    await page.goto('/dashboard');
    
    // Wait for dashboard to load
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should display main dashboard components', async ({ page }) => {
    // Check for main navigation
    await expect(page.locator('nav')).toBeVisible();
    
    // Check for dashboard sections
    await expect(page.locator('[data-testid="stats-overview"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-items"]')).toBeVisible();
    await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible();
    
    // Check for sidebar navigation
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    
    // Verify main menu items
    const menuItems = ['Collections', 'Templates', 'Analytics', 'Settings'];
    for (const item of menuItems) {
      await expect(page.locator(`text="${item}"`)).toBeVisible();
    }
  });

  test('should show user statistics correctly', async ({ page }) => {
    // Wait for stats to load
    await page.waitForSelector('[data-testid="stats-overview"]');
    
    // Check for stat cards
    const statCards = page.locator('[data-testid="stat-card"]');
    await expect(statCards).toHaveCount(4); // Total Items, Optimized, Success Rate, Processing
    
    // Verify stat values are numbers
    const statValues = page.locator('[data-testid="stat-value"]');
    const count = await statValues.count();
    
    for (let i = 0; i < count; i++) {
      const text = await statValues.nth(i).textContent();
      expect(text).toMatch(/\d+/); // Should contain numbers
    }
  });

  test('should navigate to different sections', async ({ page }) => {
    // Test navigation to Collections
    await page.click('text="Collections"');
    await expect(page).toHaveURL('/dashboard/collections');
    await expect(page.locator('h1')).toContainText('Collections');
    
    // Test navigation to Templates
    await page.click('text="Templates"');
    await expect(page).toHaveURL('/dashboard/templates');
    await expect(page.locator('h1')).toContainText('Templates');
    
    // Test navigation to Analytics
    await page.click('text="Analytics"');
    await expect(page).toHaveURL('/dashboard/analytics');
    await expect(page.locator('h1')).toContainText('Analytics');
    
    // Test back to main dashboard
    await page.click('text="Dashboard"');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should handle quick actions', async ({ page }) => {
    // Test "Create New Item" action
    await page.click('[data-testid="quick-action-new-item"]');
    
    // Should open create item modal or navigate to create page
    await expect(
      page.locator('[data-testid="create-item-modal"]')
        .or(page.locator('h1:has-text("Create New Item")'))
    ).toBeVisible();
    
    // Close modal if it opened
    const modal = page.locator('[data-testid="create-item-modal"]');
    if (await modal.isVisible()) {
      await page.click('[data-testid="close-modal"]');
    } else {
      // Go back if we navigated
      await page.goBack();
    }
    
    // Test "Import Content" action
    await page.click('[data-testid="quick-action-import"]');
    await expect(page).toHaveURL('/dashboard/import');
    
    await page.goBack();
    
    // Test "View Analytics" action
    await page.click('[data-testid="quick-action-analytics"]');
    await expect(page).toHaveURL('/dashboard/analytics');
  });

  test('should display recent items', async ({ page }) => {
    const recentItemsSection = page.locator('[data-testid="recent-items"]');
    await expect(recentItemsSection).toBeVisible();
    
    // Check if there are items or empty state
    const itemCards = page.locator('[data-testid="item-card"]');
    const emptyState = page.locator('[data-testid="empty-state"]');
    
    const itemCount = await itemCards.count();
    
    if (itemCount > 0) {
      // Verify item cards have proper structure
      const firstItem = itemCards.first();
      await expect(firstItem.locator('[data-testid="item-name"]')).toBeVisible();
      await expect(firstItem.locator('[data-testid="item-type"]')).toBeVisible();
      await expect(firstItem.locator('[data-testid="item-date"]')).toBeVisible();
      
      // Test clicking on an item
      await firstItem.click();
      
      // Should navigate to item details or open modal
      await expect(
        page.locator('[data-testid="item-details"]')
          .or(page.locator('h1:has-text("Item Details")'))
      ).toBeVisible();
    } else {
      // Should show empty state
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText('No items found');
    }
  });

  test('should handle search functionality', async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"]');
    
    if (await searchInput.isVisible()) {
      // Test search input
      await searchInput.fill('test prompt');
      await page.keyboard.press('Enter');
      
      // Should show search results or navigate to search page
      await expect(
        page.locator('[data-testid="search-results"]')
          .or(page.locator('h1:has-text("Search Results")'))
      ).toBeVisible();
      
      // Clear search
      await searchInput.clear();
    }
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Test desktop view (default)
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Sidebar might be hidden or collapsed
    const sidebar = page.locator('[data-testid="sidebar"]');
    const mobileMenu = page.locator('[data-testid="mobile-menu-toggle"]');
    
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(sidebar).toBeVisible();
    }
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Should have mobile navigation
    await expect(
      page.locator('[data-testid="mobile-menu-toggle"]')
        .or(page.locator('[data-testid="mobile-nav"]'))
    ).toBeVisible();
    
    // Stats should stack on mobile
    const statsContainer = page.locator('[data-testid="stats-overview"]');
    const containerBox = await statsContainer.boundingBox();
    expect(containerBox?.width).toBeLessThan(400);
  });

  test('should handle real-time updates', async ({ page }) => {
    // Open a second tab to simulate real-time updates
    const secondPage = await page.context().newPage();
    await secondPage.goto('/dashboard');
    
    // Create an item in the second tab
    await secondPage.click('[data-testid="quick-action-new-item"]');
    
    if (await secondPage.locator('[data-testid="create-item-modal"]').isVisible()) {
      await secondPage.fill('[data-testid="item-name"]', 'Real-time Test Item');
      await secondPage.fill('[data-testid="item-content"]', 'This is a test for real-time updates');
      await secondPage.selectOption('[data-testid="item-type"]', 'prompt');
      await secondPage.click('[data-testid="save-item"]');
      
      // Wait for success message
      await expect(secondPage.locator('[data-testid="success-message"]')).toBeVisible();
    }
    
    // Check if the first tab receives the update
    await page.waitForTimeout(2000); // Give time for real-time update
    
    // The stats should update
    const statsCards = page.locator('[data-testid="stat-card"]');
    await expect(statsCards.first()).toBeVisible();
    
    // Clean up
    await secondPage.close();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Simulate network error by intercepting API calls
    await page.route('/api/items**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    // Refresh page to trigger the error
    await page.reload();
    
    // Should show error state or retry option
    await expect(
      page.locator('[data-testid="error-message"]')
        .or(page.locator('text="Something went wrong"'))
        .or(page.locator('[data-testid="retry-button"]'))
    ).toBeVisible();
    
    // Clear the route intercept
    await page.unroute('/api/items**');
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab');
    
    // Should focus on first interactive element
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test arrow key navigation in stats cards
    const statsContainer = page.locator('[data-testid="stats-overview"]');
    await statsContainer.click();
    
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    
    // Test Enter key on action buttons
    const quickActionButton = page.locator('[data-testid="quick-action-new-item"]');
    await quickActionButton.focus();
    await page.keyboard.press('Enter');
    
    // Should trigger the action
    await expect(
      page.locator('[data-testid="create-item-modal"]')
        .or(page.locator('h1:has-text("Create New Item")'))
    ).toBeVisible();
  });

  test('should persist user preferences', async ({ page }) => {
    // Test theme switching if available
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      
      // Verify theme changed
      const body = page.locator('body');
      const hasColorScheme = await body.evaluate(el => 
        getComputedStyle(el).colorScheme
      );
      
      expect(hasColorScheme).toBeTruthy();
      
      // Refresh page and verify theme persisted
      await page.reload();
      
      const persistedColorScheme = await body.evaluate(el => 
        getComputedStyle(el).colorScheme
      );
      
      expect(persistedColorScheme).toBe(hasColorScheme);
    }
    
    // Test sidebar collapse preference
    const sidebarToggle = page.locator('[data-testid="sidebar-toggle"]');
    
    if (await sidebarToggle.isVisible()) {
      await sidebarToggle.click();
      
      // Refresh and verify state persisted
      await page.reload();
      
      // Should maintain collapsed state
      const sidebar = page.locator('[data-testid="sidebar"]');
      const sidebarClass = await sidebar.getAttribute('class');
      expect(sidebarClass).toContain('collapsed');
    }
  });
});