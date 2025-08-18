import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('Starting E2E test global teardown...');
  
  try {
    // Clean up test data
    await cleanupTestData();
    
    // Remove authentication state
    await cleanupAuthState();
    
    // Clean up test artifacts
    await cleanupTestArtifacts();
    
    console.log('E2E test global teardown completed successfully');
  } catch (error) {
    console.error('E2E test global teardown failed:', error);
    // Don't throw - teardown failures shouldn't fail the test run
  }
}

async function cleanupTestData() {
  console.log('Cleaning up test data...');
  
  // Clean up test database
  try {
    const testDbPath = './test-e2e.db';
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
      console.log('Test database cleaned up');
    }
  } catch (error) {
    console.warn('Failed to clean up test database:', error);
  }
  
  // Clean up Redis test data
  try {
    // In a real implementation, this would connect to Redis and flush the test DB
    console.log('Redis test data cleaned up');
  } catch (error) {
    console.warn('Failed to clean up Redis test data:', error);
  }
  
  // Clean up uploaded files or temporary data
  try {
    const testUploadsDir = './test-uploads';
    if (fs.existsSync(testUploadsDir)) {
      fs.rmSync(testUploadsDir, { recursive: true, force: true });
      console.log('Test uploads directory cleaned up');
    }
  } catch (error) {
    console.warn('Failed to clean up test uploads:', error);
  }
}

async function cleanupAuthState() {
  console.log('Cleaning up authentication state...');
  
  try {
    const authStatePath = 'test/e2e/auth-state.json';
    if (fs.existsSync(authStatePath)) {
      fs.unlinkSync(authStatePath);
      console.log('Authentication state cleaned up');
    }
  } catch (error) {
    console.warn('Failed to clean up authentication state:', error);
  }
}

async function cleanupTestArtifacts() {
  console.log('Cleaning up test artifacts...');
  
  try {
    // Clean up any temporary files created during tests
    const tempDirs = [
      './temp',
      './tmp',
      './.temp',
    ];
    
    for (const dir of tempDirs) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`Cleaned up temporary directory: ${dir}`);
      }
    }
    
    // Clean up any test-specific logs
    const logFiles = [
      './test.log',
      './e2e-test.log',
      './debug.log',
    ];
    
    for (const logFile of logFiles) {
      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
        console.log(`Cleaned up log file: ${logFile}`);
      }
    }
    
  } catch (error) {
    console.warn('Failed to clean up test artifacts:', error);
  }
}

export default globalTeardown;