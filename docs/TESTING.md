# ContextForge Testing Framework

This document provides comprehensive documentation for the ContextForge testing framework, covering all testing strategies, tools, and best practices implemented.

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Test Types](#test-types)
3. [Testing Tools](#testing-tools)
4. [Running Tests](#running-tests)
5. [Test Structure](#test-structure)
6. [Coverage Requirements](#coverage-requirements)
7. [CI/CD Integration](#cicd-integration)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Testing Strategy

Our testing strategy follows the testing pyramid approach:

```
         /\
        /E2E\      <- 10% - Few, high-value end-to-end tests
       /------\
      /Integr. \   <- 20% - API and database integration tests
     /----------\
    /   Unit     \ <- 70% - Fast, isolated unit tests
   /--------------\
```

### Quality Gates

- **Code Coverage**: Minimum 80% statement coverage
- **Branch Coverage**: Minimum 75% branch coverage
- **Function Coverage**: Minimum 80% function coverage
- **Security**: All high and critical vulnerabilities must be resolved
- **Performance**: Core operations must complete within performance thresholds

## Test Types

### 1. Unit Tests (`test/unit/`)

**Purpose**: Test individual functions, classes, and components in isolation.

**Characteristics**:
- Fast execution (< 100ms per test)
- No external dependencies
- Comprehensive mocking
- High code coverage

**Examples**:
- Swarm orchestrator task management
- Optimization pipeline logic
- Queue workers
- Utility functions

### 2. Integration Tests (`test/integration/`)

**Purpose**: Test interactions between different parts of the system.

**Characteristics**:
- Test API endpoints
- Database operations
- External service integrations
- Real database connections

**Examples**:
- API endpoint responses
- Database query operations
- Authentication flows
- WebSocket connections

### 3. End-to-End Tests (`test/e2e/`)

**Purpose**: Test complete user workflows in a browser environment.

**Characteristics**:
- Real browser testing
- Complete user journeys
- Cross-browser compatibility
- Responsive design validation

**Examples**:
- User registration and login
- Item creation and management
- Dashboard functionality
- Real-time updates

### 4. Performance Tests (`test/performance/`)

**Purpose**: Validate system performance under various loads.

**Characteristics**:
- Load testing
- Memory usage validation
- Response time measurements
- Concurrency testing

**Examples**:
- Optimization pipeline throughput
- WebSocket connection scalability
- Database query performance
- Memory leak detection

### 5. Security Tests (`test/security/`)

**Purpose**: Validate security measures and identify vulnerabilities.

**Characteristics**:
- Authentication testing
- Authorization validation
- Input sanitization
- SQL injection prevention

**Examples**:
- Login security
- JWT token validation
- XSS prevention
- CSRF protection

## Testing Tools

### Core Testing Framework
- **Jest**: Primary test runner and assertion library
- **TypeScript**: Type-safe test development
- **Playwright**: End-to-end browser testing
- **Supertest**: HTTP endpoint testing

### Utilities and Mocks
- **@testing-library/react**: React component testing
- **@testing-library/jest-dom**: DOM testing utilities
- **Custom mocks**: Service layer mocking

### CI/CD Tools
- **GitHub Actions**: Automated test execution
- **Codecov**: Code coverage reporting
- **SonarCloud**: Code quality analysis
- **Snyk**: Security vulnerability scanning

## Running Tests

### Prerequisites

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.test

# Setup test database
pnpm prisma db push --force-reset
```

### Test Commands

```bash
# Run all tests
pnpm test:all

# Unit tests
pnpm test:unit
pnpm test:unit -- --watch

# Integration tests
pnpm test:integration

# End-to-end tests
pnpm test:e2e
pnpm test:e2e:ui  # Interactive mode

# Performance tests
pnpm test:performance

# Security tests
pnpm test:security

# Coverage report
pnpm test:coverage
```

### Test Filtering

```bash
# Run specific test file
pnpm test -- optimization-pipeline.test.ts

# Run tests matching pattern
pnpm test -- --testNamePattern="should handle"

# Run tests for specific component
pnpm test:unit -- --testPathPattern="swarm"
```

## Test Structure

### File Organization

```
test/
├── setup.ts                 # Global test setup
├── utils/
│   ├── test-utils.tsx       # Custom render functions
│   └── fixtures.ts          # Test data factories
├── mocks/
│   ├── services.ts          # Service mocks
│   └── api.ts              # API mocks
├── unit/
│   ├── swarm/              # Swarm system tests
│   ├── pipeline/           # Pipeline tests
│   └── queue/              # Queue worker tests
├── integration/
│   └── api/                # API endpoint tests
├── performance/
│   ├── optimization-pipeline.test.ts
│   └── websocket.test.ts
├── security/
│   ├── auth.test.ts
│   └── input-validation.test.ts
└── e2e/
    ├── global-setup.ts
    ├── global-teardown.ts
    ├── dashboard.spec.ts
    └── item-management.spec.ts
```

### Test Naming Conventions

```typescript
describe('Component/Function Name', () => {
  describe('specific functionality', () => {
    test('should do something specific when condition', async () => {
      // Test implementation
    });
  });
});
```

### Test Data Management

```typescript
// Use factories for consistent test data
const mockUser = createMockUser({
  email: 'test@example.com',
  role: 'admin'
});

const mockItem = createMockItem({
  type: 'prompt',
  userId: mockUser.id
});
```

## Coverage Requirements

### Minimum Coverage Thresholds

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 75,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

### Coverage Exclusions

- Configuration files
- Type definitions
- Test files themselves
- Generated code (Prisma client)
- Build artifacts

### Coverage Reporting

```bash
# Generate HTML report
pnpm test:coverage

# View report
open coverage/lcov-report/index.html
```

## CI/CD Integration

### GitHub Actions Workflow

The test suite runs automatically on:
- Pull requests to `main` and `develop`
- Pushes to `main` and `develop`
- Manual workflow dispatch

### Test Pipeline Stages

1. **Lint & Type Check**: ESLint and TypeScript validation
2. **Unit Tests**: Fast, isolated unit tests
3. **Integration Tests**: API and database tests
4. **Security Tests**: Security vulnerability scanning
5. **Performance Tests**: Performance validation
6. **E2E Tests**: Browser-based user workflow tests
7. **Build Verification**: Production build validation
8. **Docker Build**: Container build verification

### Quality Gates

Tests must pass before code can be merged:
- All test suites must pass
- Coverage thresholds must be met
- No high/critical security vulnerabilities
- Build must succeed
- Performance tests must meet thresholds

## Best Practices

### Writing Tests

1. **Follow AAA Pattern**:
   ```typescript
   test('should calculate total correctly', () => {
     // Arrange
     const items = [{ price: 10 }, { price: 20 }];
     
     // Act
     const total = calculateTotal(items);
     
     // Assert
     expect(total).toBe(30);
   });
   ```

2. **Use Descriptive Names**:
   ```typescript
   // Good
   test('should throw error when user is not authenticated')
   
   // Bad
   test('error test')
   ```

3. **Test Behavior, Not Implementation**:
   ```typescript
   // Good - tests behavior
   expect(component.getByRole('button')).toBeInTheDocument();
   
   // Bad - tests implementation
   expect(component.find('.btn-class')).toHaveLength(1);
   ```

### Mocking Guidelines

1. **Mock External Dependencies**:
   ```typescript
   jest.mock('@/lib/db', () => ({
     prisma: mockPrisma
   }));
   ```

2. **Use Factory Functions**:
   ```typescript
   const createMockUser = (overrides = {}) => ({
     id: 'user-123',
     email: 'test@example.com',
     ...overrides
   });
   ```

3. **Reset Mocks Between Tests**:
   ```typescript
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

### Performance Testing

1. **Set Realistic Thresholds**:
   ```typescript
   test('should process 1000 items under 100ms', async () => {
     const start = performance.now();
     await processItems(generateItems(1000));
     const duration = performance.now() - start;
     
     expect(duration).toBeLessThan(100);
   });
   ```

2. **Test Memory Usage**:
   ```typescript
   test('should not leak memory', async () => {
     const initialMemory = process.memoryUsage().heapUsed;
     
     await processLargeDataset();
     global.gc?.();
     
     const finalMemory = process.memoryUsage().heapUsed;
     expect(finalMemory - initialMemory).toBeLessThan(50 * 1024 * 1024);
   });
   ```

### E2E Testing

1. **Use Page Object Model**:
   ```typescript
   class DashboardPage {
     constructor(private page: Page) {}
     
     async navigateToCollections() {
       await this.page.click('text="Collections"');
       await expect(this.page).toHaveURL('/dashboard/collections');
     }
   }
   ```

2. **Handle Async Operations**:
   ```typescript
   await expect(page.locator('[data-testid="loading"]')).toBeVisible();
   await expect(page.locator('[data-testid="loading"]')).not.toBeVisible();
   await expect(page.locator('[data-testid="content"]')).toBeVisible();
   ```

## Troubleshooting

### Common Issues

1. **Tests Timeout**:
   ```bash
   # Increase timeout
   jest.setTimeout(30000);
   
   # Or in individual test
   test('long running test', async () => {
     // test code
   }, 30000);
   ```

2. **Database Connection Issues**:
   ```bash
   # Reset test database
   pnpm prisma db push --force-reset
   
   # Check database URL
   echo $DATABASE_URL
   ```

3. **WebSocket Connection Failures**:
   ```typescript
   // Add proper cleanup
   afterEach(async () => {
     await wsManager.disconnectAll();
   });
   ```

4. **Memory Leaks in Tests**:
   ```typescript
   // Force garbage collection
   if (global.gc) {
     global.gc();
   }
   
   // Clear timers
   jest.clearAllTimers();
   ```

### Debugging Tests

1. **Debug Single Test**:
   ```bash
   pnpm test -- --testNamePattern="specific test" --verbose
   ```

2. **Debug E2E Tests**:
   ```bash
   pnpm test:e2e:ui  # Opens Playwright UI
   ```

3. **Debug with Chrome DevTools**:
   ```bash
   node --inspect-brk node_modules/.bin/jest --runInBand
   ```

### Performance Issues

1. **Slow Test Suites**:
   - Review test parallelization
   - Check for unnecessary async operations
   - Optimize database setup/teardown

2. **High Memory Usage**:
   - Clear mocks between tests
   - Avoid creating large test datasets
   - Monitor for memory leaks

### CI/CD Issues

1. **Flaky Tests**:
   - Add proper wait conditions
   - Increase timeouts for CI environment
   - Use deterministic test data

2. **Environment Differences**:
   - Use consistent Node.js versions
   - Check environment variables
   - Verify service dependencies

## Monitoring and Metrics

### Test Metrics Tracked

- Test execution time
- Coverage percentages
- Flaky test rates
- Failed test trends
- Performance regression detection

### Reporting

- Daily coverage reports
- Weekly performance trends
- Monthly test suite health reports
- Real-time CI/CD status

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure coverage thresholds are met
3. Add both positive and negative test cases
4. Include edge case testing
5. Update documentation as needed

For questions or issues with the testing framework, please refer to the development team or create an issue in the repository.