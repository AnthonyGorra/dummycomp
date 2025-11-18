import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  rateLimiters,
  getClientIp,
  getUserId,
  getApiKey,
  createRateLimitResponse,
  addRateLimitHeaders,
  applySecurityHeaders,
  generateCSRFToken,
  verifyCSRFToken,
} from './lib/security'
import { securityConfig, isCSRFExempt, requiresApiKey, isValidApiKey } from './lib/security/config'

export async function middleware(req: NextRequest) {
  let res = NextResponse.next()

  // 1. Apply security headers to all responses
  if (securityConfig.headers.enabled) {
    res = applySecurityHeaders(res)
  }

  // 2. Rate limiting
  if (securityConfig.rateLimit.enabled) {
    const clientIp = getClientIp(req)
    const userId = getUserId(req)
    const apiKey = getApiKey(req)

    // Rate limit by IP for all requests
    const ipRateLimit = rateLimiters.general.check(clientIp)
    if (!ipRateLimit.allowed) {
      return createRateLimitResponse(ipRateLimit)
    }
    res = addRateLimitHeaders(res, ipRateLimit)

    // Additional rate limiting for API routes
    if (req.nextUrl.pathname.startsWith('/api/')) {
      // Rate limit by user if authenticated
      if (userId) {
        const userRateLimit = rateLimiters.apiPerUser.check(userId)
        if (!userRateLimit.allowed) {
          return createRateLimitResponse(userRateLimit)
        }
      }

      // Rate limit by API key if provided
      if (apiKey) {
        const keyRateLimit = rateLimiters.apiPerKey.check(apiKey)
        if (!keyRateLimit.allowed) {
          return createRateLimitResponse(keyRateLimit)
        }
      }

      // Strict rate limiting for auth endpoints
      if (req.nextUrl.pathname.startsWith('/api/auth/')) {
        const authRateLimit = rateLimiters.auth.check(clientIp)
        if (!authRateLimit.allowed) {
          return createRateLimitResponse(authRateLimit)
        }
      }

      // Rate limiting for webhook endpoints
      if (req.nextUrl.pathname.startsWith('/api/webhooks/')) {
        const webhookRateLimit = rateLimiters.webhook.check(clientIp)
        if (!webhookRateLimit.allowed) {
          return createRateLimitResponse(webhookRateLimit)
        }
      }
    }
  }

  // 3. API Key validation for protected endpoints
  if (requiresApiKey(req.nextUrl.pathname)) {
    const apiKey = getApiKey(req)
    if (!apiKey || !isValidApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      )
    }
  }

  // 4. CSRF Protection for non-exempt paths
  if (securityConfig.csrf.enabled && !isCSRFExempt(req.nextUrl.pathname)) {
    const method = req.method.toUpperCase()

    // Generate CSRF token for GET requests
    if (method === 'GET' || method === 'HEAD') {
      const { response: csrfResponse } = generateCSRFToken(res)
      res = csrfResponse
    }
    // Verify CSRF token for state-changing requests
    else if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const isValid = verifyCSRFToken(req)
      if (!isValid) {
        return NextResponse.json(
          {
            error: 'Invalid CSRF token',
            message: 'CSRF token validation failed. Please refresh the page and try again.',
          },
          { status: 403 }
        )
      }
    }
  }

  // 5. CORS handling
  if (securityConfig.cors.enabled) {
    const origin = req.headers.get('origin')

    if (origin) {
      // For preflight requests
      if (req.method === 'OPTIONS') {
        const preflightRes = new NextResponse(null, { status: 204 })
        preflightRes.headers.set('Access-Control-Allow-Origin', origin)
        preflightRes.headers.set(
          'Access-Control-Allow-Methods',
          securityConfig.cors.allowedMethods.join(', ')
        )
        preflightRes.headers.set(
          'Access-Control-Allow-Headers',
          securityConfig.cors.allowedHeaders.join(', ')
        )
        if (securityConfig.cors.credentials) {
          preflightRes.headers.set('Access-Control-Allow-Credentials', 'true')
        }
        preflightRes.headers.set('Access-Control-Max-Age', '86400') // 24 hours
        return applySecurityHeaders(preflightRes)
      }

      // For actual requests, add CORS headers
      res.headers.set('Access-Control-Allow-Origin', origin)
      if (securityConfig.cors.credentials) {
        res.headers.set('Access-Control-Allow-Credentials', 'true')
      }
    }
  }

  // 6. Redirect root to dashboard (existing functionality)
  if (req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}