import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Starting E2E test global setup...');
  
  // Launch a browser for authentication setup
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Set up test environment
    await setupTestEnvironment();
    
    // Create authenticated user session
    await setupAuthenticatedUser(page);
    
    console.log('E2E test global setup completed successfully');
  } catch (error) {
    console.error('E2E test global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function setupTestEnvironment() {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'file:./test-e2e.db';
  process.env.REDIS_URL = 'redis://localhost:6379/14'; // Separate test DB
  
  // Initialize test database
  await initializeTestDatabase();
  
  // Clear any existing test data
  await clearTestData();
}

async function initializeTestDatabase() {
  // In a real implementation, this would:
  // 1. Run database migrations
  // 2. Seed initial test data
  // 3. Set up test users and permissions
  
  console.log('Initializing test database...');
  
  // Mock database initialization
  // This would typically use Prisma migrations or similar
}

async function clearTestData() {
  console.log('Clearing existing test data...');
  
  // Clear test database tables
  // Clear Redis test data
  // Reset any file uploads or temporary data
}

async function setupAuthenticatedUser(page: any) {
  // Create a test user and store authentication
  const testUser = {
    email: 'e2e-test@example.com',
    password: 'TestPassword123!',
    name: 'E2E Test User',
  };
  
  try {
    // Navigate to registration page
    await page.goto('/register');
    
    // Fill registration form
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.fill('[name="name"]', testUser.name);
    
    // Submit registration
    await page.click('button[type="submit"]');
    
    // Wait for successful registration
    await page.waitForURL('/dashboard');
    
    // Store authentication state
    await page.context().storageState({
      path: 'test/e2e/auth-state.json'
    });
    
    console.log('Test user authenticated and state saved');
  } catch (error) {
    console.log('User might already exist, attempting login...');
    
    // Try logging in with existing user
    await page.goto('/login');
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    
    try {
      await page.waitForURL('/dashboard', { timeout: 5000 });
      
      // Store authentication state
      await page.context().storageState({
        path: 'test/e2e/auth-state.json'
      });
      
      console.log('Logged in with existing test user');
    } catch (loginError) {
      console.error('Failed to authenticate test user:', loginError);
      throw loginError;
    }
  }
}

export default globalSetup;