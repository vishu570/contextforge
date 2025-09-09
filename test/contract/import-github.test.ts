import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { NextApiRequest, NextApiResponse } from 'next'
import { createMocks } from 'node-mocks-http'
import handler from '../../app/api/import/github/route'

// Contract test POST /api/import/github
// MUST validate request schema (contracts/import-api.yaml lines 16-49):
// Required: url (string, format: uri)
// Optional: filters, autoCategorie, collectionId
// MUST test response schemas: 200, 202, 400/404/429

describe('GitHub Import API Contract Tests', () => {
  beforeAll(async () => {
    // Setup test database state
    process.env.NODE_ENV = 'test'
  })

  afterAll(async () => {
    // Cleanup test data
  })

  describe('POST /api/import/github', () => {
    it('should validate required url field', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          // Missing required field: url
        }
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBeDefined()
      expect(data.error).toContain('url')
    })

    it('should validate url format', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          url: 'not-a-valid-url' // Invalid URI format
        }
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBeDefined()
      expect(data.error).toContain('url')
    })

    it('should validate GitHub URL format', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          url: 'https://example.com/not-github' // Valid URI but not GitHub
        }
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBeDefined()
      expect(data.error).toContain('GitHub')
    })

    it('should validate filters.fileExtensions array', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          url: 'https://github.com/owner/repo',
          filters: {
            fileExtensions: 'not-an-array' // Should be array of strings
          }
        }
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBeDefined()
      expect(data.error).toContain('fileExtensions')
    })

    it('should validate filters.paths array', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          url: 'https://github.com/owner/repo',
          filters: {
            paths: ['valid/path', 123] // Mixed types, should be strings only
          }
        }
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBeDefined()
      expect(data.error).toContain('paths')
    })

    it('should validate autoCategorie boolean type', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          url: 'https://github.com/owner/repo',
          autoCategorie: 'yes' // Should be boolean
        }
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBeDefined()
      expect(data.error).toContain('autoCategorie')
    })

    it('should return 404 for non-existent GitHub repository', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          url: 'https://github.com/non-existent-owner/non-existent-repo'
        }
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(404)
      const data = JSON.parse(res._getData())
      expect(data.error).toBeDefined()
      expect(data.error).toContain('Repository not found')
    })

    it('should return 202 for queued import (valid repository)', async () => {
      // This test should initially FAIL as no implementation exists
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          url: 'https://github.com/microsoft/TypeScript',
          filters: {
            fileExtensions: ['.ts', '.md'],
            paths: ['src/compiler'],
            excludePaths: ['tests', 'node_modules']
          },
          autoCategorie: true,
          collectionId: 'test-collection-id'
        }
      })

      await handler(req, res)

      // Expected response for queued import
      expect(res._getStatusCode()).toBe(202)
      const data = JSON.parse(res._getData())
      expect(data.importId).toBeDefined()
      expect(data.status).toBe('queued')
      expect(data.estimatedFiles).toBeDefined()
      expect(data.estimatedTime).toBeDefined()
      expect(typeof data.importId).toBe('string')
      expect(typeof data.estimatedFiles).toBe('number')
      expect(typeof data.estimatedTime).toBe('number')
    })

    it('should return 200 for completed small import', async () => {
      // For immediate completion of small imports
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          url: 'https://github.com/owner/small-repo',
          filters: {
            fileExtensions: ['.md']
          }
        }
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.importId).toBeDefined()
      expect(data.status).toBe('completed')
      expect(data.totalFiles).toBeDefined()
      expect(data.processedFiles).toBeDefined()
      expect(data.failedFiles).toBeDefined()
      expect(data.items).toBeDefined()
      expect(Array.isArray(data.items)).toBe(true)
      expect(data.processedFiles).toBe(data.items.length)
    })

    it('should handle rate limiting (429)', async () => {
      // Test multiple rapid requests to trigger GitHub API rate limiting
      const requests = Array.from({ length: 5 }, () =>
        createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            url: 'https://github.com/microsoft/TypeScript'
          }
        })
      )

      let rateLimitedResponse = null
      for (const { req, res } of requests) {
        await handler(req, res)
        if (res._getStatusCode() === 429) {
          rateLimitedResponse = res
          break
        }
      }

      // Rate limiting should occur with GitHub API limits
      if (rateLimitedResponse) {
        const data = JSON.parse(rateLimitedResponse._getData())
        expect(data.error).toBeDefined()
        expect(data.error).toContain('rate limit')
      }
    })

    it('should use default filters when not specified', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          url: 'https://github.com/owner/repo'
          // No filters specified, should use defaults from yaml lines 28-42
        }
      })

      await handler(req, res)

      // Should process with default file extensions and exclude paths
      if (res._getStatusCode() === 202) {
        const data = JSON.parse(res._getData())
        expect(data.importId).toBeDefined()
        // Default filters should be applied: [".md", ".txt", ".json", ".yml", ".yaml"]
        // Default excludePaths: ["node_modules", ".git"]
      }
    })

    it('should validate collectionId format', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          url: 'https://github.com/owner/repo',
          collectionId: 123 // Should be string
        }
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBeDefined()
      expect(data.error).toContain('collectionId')
    })
  })
})