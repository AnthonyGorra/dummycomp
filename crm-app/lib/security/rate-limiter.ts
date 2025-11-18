/**
 * Rate Limiting Module
 *
 * Provides rate limiting functionality to prevent abuse
 * and DDoS attacks at the application level.
 */

import { NextRequest } from 'next/server';

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Maximum requests per window
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private static stores: Map<string, Map<string, RateLimitEntry>> = new Map();
  private static cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize rate limiter with automatic cleanup
   */
  static initialize() {
    // Cleanup expired entries every 5 minutes
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Check if request is within rate limit
   */
  static checkLimit(
    identifier: string,
    config: RateLimitConfig,
    storeName: string = 'default'
  ): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    if (!this.stores.has(storeName)) {
      this.stores.set(storeName, new Map());
    }

    const store = this.stores.get(storeName)!;
    const now = Date.now();
    const entry = store.get(identifier);

    // No previous entry or window expired
    if (!entry || now >= entry.resetTime) {
      store.set(identifier, {
        count: 1,
        resetTime: now + config.windowMs,
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
      };
    }

    // Increment count
    entry.count++;

    if (entry.count > config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Get rate limit configuration based on endpoint type
   */
  static getConfig(endpointType: 'api' | 'auth' | 'admin'): RateLimitConfig {
    switch (endpointType) {
      case 'admin':
        return {
          windowMs: parseInt(process.env.ADMIN_RATE_LIMIT_WINDOW || '900000'), // 15 minutes
          maxRequests: parseInt(process.env.ADMIN_RATE_LIMIT_MAX || '100'),
        };
      case 'auth':
        return {
          windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW || '900000'), // 15 minutes
          maxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5'),
        };
      case 'api':
      default:
        return {
          windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW || '60000'), // 1 minute
          maxRequests: parseInt(process.env.API_RATE_LIMIT_MAX || '100'),
        };
    }
  }

  /**
   * Create rate limit response
   */
  static createRateLimitResponse(resetTime: number): Response {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Reset': new Date(resetTime).toISOString(),
        },
      }
    );
  }

  /**
   * Clean up expired entries
   */
  private static cleanup() {
    const now = Date.now();

    this.stores.forEach((store, storeName) => {
      const keysToDelete: string[] = [];

      store.forEach((entry, key) => {
        if (now >= entry.resetTime) {
          keysToDelete.push(key);
        }
      });

      keysToDelete.forEach(key => store.delete(key));

      if (store.size === 0) {
        this.stores.delete(storeName);
      }
    });
  }

  /**
   * Get identifier from request (IP address)
   */
  static getIdentifier(request: NextRequest): string {
    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return realIP.trim();
    }

    const cfIP = request.headers.get('cf-connecting-ip');
    if (cfIP) {
      return cfIP.trim();
    }

    return request.ip || 'unknown';
  }
}

// Initialize on module load
RateLimiter.initialize();

/**
 * Middleware helper for rate limiting
 */
export function requireRateLimit(
  request: NextRequest,
  endpointType: 'api' | 'auth' | 'admin' = 'api'
): Response | null {
  const identifier = RateLimiter.getIdentifier(request);
  const config = RateLimiter.getConfig(endpointType);
  const result = RateLimiter.checkLimit(identifier, config, endpointType);

  if (!result.allowed) {
    console.warn(`[Security] Rate limit exceeded for ${identifier} on ${endpointType} endpoint`);
    return RateLimiter.createRateLimitResponse(result.resetTime);
  }

  return null;
}
