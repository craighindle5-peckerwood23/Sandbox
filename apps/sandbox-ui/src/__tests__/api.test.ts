/**
 * api.test.ts
 * Smoke tests for the /api/chat and /api/push route handlers.
 * Uses node-mocks-http for req/res simulation (no real network calls).
 */
import { createMocks } from 'node-mocks-http'

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

beforeEach(() => {
  mockFetch.mockReset()
  process.env.BACKEND_API_URL = 'https://fake-backend.example.com'
})

// ── /api/chat ────────────────────────────────────────────────────────────────

describe('/api/chat', () => {
  it('returns 405 for GET', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    const handler = (await import('../pages/api/chat/index')).default
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(405)
  })

  it('returns 500 when BACKEND_API_URL is not set', async () => {
    delete process.env.BACKEND_API_URL
    jest.resetModules()
    const { req, res } = createMocks({ method: 'POST', body: { messages: [] } })
    const handler = (await import('../pages/api/chat/index')).default
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(500)
  })

  it('proxies to codegenChat and returns reply', async () => {
    // tree call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: ['app/page.tsx'] }),
    })
    // chat call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ reply: 'Here is your code', codeBlocks: [] }),
    })

    jest.resetModules()
    process.env.BACKEND_API_URL = 'https://fake-backend.example.com'
    const { req, res } = createMocks({ method: 'POST', body: { messages: [{ role: 'user', content: 'hello' }] } })
    const handler = (await import('../pages/api/chat/index')).default
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.reply).toBe('Here is your code')
  })
})

// ── /api/push ────────────────────────────────────────────────────────────────

describe('/api/push', () => {
  it('returns 405 for GET', async () => {
    jest.resetModules()
    process.env.BACKEND_API_URL = 'https://fake-backend.example.com'
    const { req, res } = createMocks({ method: 'GET' })
    const handler = (await import('../pages/api/push/index')).default
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(405)
  })

  it('proxies to pushToRepo and returns pr_url', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, pr_url: 'https://github.com/pr/1', pr_number: 1 }),
    })
    jest.resetModules()
    process.env.BACKEND_API_URL = 'https://fake-backend.example.com'
    const { req, res } = createMocks({
      method: 'POST',
      body: { branchName: 'forge/test', files: [], prTitle: 'feat: test', prBody: 'test' },
    })
    const handler = (await import('../pages/api/push/index')).default
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.pr_url).toBe('https://github.com/pr/1')
  })
})
