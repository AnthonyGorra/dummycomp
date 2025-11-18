import { NextRequest, NextResponse } from 'next/server'

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyPrefix?: string // Prefix for storage keys
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}

// In-memory store for rate limiting (use Redis in production)
class RateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, value] of this.store.entries()) {
        if (value.resetTime < now) {
          this.store.delete(key)
        }
      }
    }, 60000)
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || entry.resetTime < now) {
      // Create new entry
      const resetTime = now + windowMs
      this.store.set(key, { count: 1, resetTime })
      return { count: 1, resetTime }
    }

    // Increment existing entry
    entry.count++
    this.store.set(key, entry)
    return entry
  }

  reset(key: string): void {
    this.store.delete(key)
  }

  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.store.clear()
  }
}

const rateLimitStore = new RateLimitStore()

/**
 * Rate limiter middleware
 */
export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = {
      keyPrefix: 'ratelimit',
      ...config,
    }
  }

  /**
   * Check rate limit for a given key
   */
  check(key: string): RateLimitResult {
    const fullKey = `${this.config.keyPrefix}:${key}`
    const { count, resetTime } = rateLimitStore.increment(fullKey, this.config.windowMs)

    const allowed = count <= this.config.maxRequests
    const remaining = Math.max(0, this.config.maxRequests - count)

    return {
      allowed,
      remaining,
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil((resetTime - Date.now()) / 1000),
    }
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    const fullKey = `${this.config.keyPrefix}:${key}`
    rateLimitStore.reset(fullKey)
  }
}

/**
 * Get client IP address from request
 */
export function getClientIp(request: NextRequest): string {
  // Check various headers for IP address (in order of precedence)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // Fallback to a default (shouldn't happen in production)
  return 'unknown'
}

/**
 * Get user ID from request (from auth token or session)
 */
export function getUserId(request: NextRequest): string | null {
  // Try to get user ID from authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    // In a real implementation, decode the JWT token here
    // For now, we'll use a placeholder
    return authHeader.substring(7)
  }

  // Try to get from custom header
  const userId = request.headers.get('x-user-id')
  if (userId) {
    return userId
  }

  return null
}

/**
 * Get API key from request
 */
export function getApiKey(request: NextRequest): string | null {
  // Check standard API key header
  const apiKey = request.headers.get('x-api-key')
  if (apiKey) {
    return apiKey
  }

  // Check n8n specific header (for backwards compatibility)
  const n8nApiKey = request.headers.get('x-n8n-api-key')
  if (n8nApiKey) {
    return n8nApiKey
  }

  return null
}

/**
 * Create rate limit response
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const response = NextResponse.json(
    {
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
      retryAfter: result.retryAfter,
    },
    { status: 429 }
  )

  // Add rate limit headers
  response.headers.set('X-RateLimit-Limit', String(result.remaining + 1))
  response.headers.set('X-RateLimit-Remaining', String(result.remaining))
  response.headers.set('X-RateLimit-Reset', String(result.resetTime))
  if (result.retryAfter) {
    response.headers.set('Retry-After', String(result.retryAfter))
  }

  return response
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(result.remaining + 1))
  response.headers.set('X-RateLimit-Remaining', String(result.remaining))
  response.headers.set('X-RateLimit-Reset', String(result.resetTime))
  return response
}

// Pre-configured rate limiters for different use cases
export const rateLimiters = {
  // Strict limit for authentication endpoints
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyPrefix: 'ratelimit:auth',
  }),

  // Standard API rate limit per IP
  apiPerIp: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    keyPrefix: 'ratelimit:api:ip',
  }),

  // API rate limit per user
  apiPerUser: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyPrefix: 'ratelimit:api:user',
  }),

  // API rate limit per API key
  apiPerKey: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000,
    keyPrefix: 'ratelimit:api:key',
  }),

  // Webhook rate limit
  webhook: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyPrefix: 'ratelimit:webhook',
  }),

  // General rate limit for all requests
  general: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 120,
    keyPrefix: 'ratelimit:general',
  }),
}
