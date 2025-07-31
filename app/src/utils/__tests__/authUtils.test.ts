import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { CapacitorHttp } from '@capacitor/core'
import { setupServer } from 'msw/node'
import { handlers } from '../../test/mswHandlers'
import { handleOAuthLogin, isNativeMobile, testConnectivity } from '../authUtils'
import apiClient from '../apiClient'

const server = setupServer(...handlers)

// Mock CapacitorHttp
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
  },
  CapacitorHttp: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('authUtils', () => {
  // Start MSW server before tests
  beforeAll(() => server.listen())
  afterAll(() => server.close())
  
  beforeEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })

  describe('isNativeMobile', () => {
    it('should return false for web platform', () => {
      expect(isNativeMobile()).toBe(false)
    })
  })

  describe('testConnectivity', () => {
    it('should return true when API is reachable', async () => {
      vi.mocked(CapacitorHttp.get).mockResolvedValue({
        status: 200,
        data: { status: 'ok' },
        headers: {},
        url: 'test',
      })

      const result = await testConnectivity()
      expect(result).toBe(true)
    })

    it('should return false when API is not reachable', async () => {
      vi.mocked(CapacitorHttp.get).mockRejectedValue(new Error('Network error'))

      const result = await testConnectivity()
      expect(result).toBe(false)
    })
  })

  describe('handleOAuthLogin', () => {
    beforeEach(() => {
      // Mock window.open
      Object.defineProperty(window, 'open', {
        value: vi.fn(() => ({
          close: vi.fn(),
          closed: false,
        })),
        writable: true,
      })

      // Mock window.addEventListener
      Object.defineProperty(window, 'addEventListener', {
        value: vi.fn(),
        writable: true,
      })

      // Mock window.removeEventListener
      Object.defineProperty(window, 'removeEventListener', {
        value: vi.fn(),
        writable: true,
      })
    })

    it('should handle web OAuth flow', async () => {
      vi.mocked(CapacitorHttp.get).mockResolvedValue({
        status: 200,
        data: {
          auth_url: 'https://accounts.google.com/oauth2/auth?mock=true',
        },
        headers: {},
        url: 'test',
      })

      // Mock successful OAuth by immediately triggering the message event
      const mockPopup = {
        close: vi.fn(),
        closed: false,
      }
      vi.mocked(window.open).mockReturnValue(mockPopup as any)

      // Start the OAuth flow
      const authPromise = handleOAuthLogin()

      // Simulate the OAuth success message
      setTimeout(() => {
        const messageEvent = new MessageEvent('message', {
          data: {
            type: 'OAUTH_SUCCESS',
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            user: JSON.stringify({
              id: 'test-id',
              email: 'test@example.com',
              name: 'Test User',
              username: 'testuser',
              provider: 'google',
            }),
          },
          origin: window.location.origin,
        })

        // Get the message handler that was added
        const addEventListenerCalls = vi.mocked(window.addEventListener).mock.calls
        const messageHandler = addEventListenerCalls.find(call => call[0] === 'message')?.[1]
        if (messageHandler && typeof messageHandler === 'function') {
          messageHandler(messageEvent as any)
        }
      }, 0)

      const result = await authPromise
      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
    })

    it.skip('should handle OAuth error', async () => {
      // Test the OAuth error by mocking the API client's get method to reject
      const mockGet = vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('API Error'))
      
      await expect(handleOAuthLogin()).rejects.toThrow('API Error')
      
      mockGet.mockRestore()
    })
  })
})
