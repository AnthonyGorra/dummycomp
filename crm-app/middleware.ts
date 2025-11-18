import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireIPWhitelist, isIPWhitelistEnabled, IPWhitelist } from './lib/security/ip-whitelist'
import { requireRateLimit } from './lib/security/rate-limiter'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // Apply rate limiting to all requests
  const rateLimitType = pathname.startsWith('/api/auth') ? 'auth' :
                        pathname.startsWith('/settings') || pathname.includes('/admin') ? 'admin' : 'api';

  const rateLimitResponse = requireRateLimit(req, rateLimitType);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // IP whitelisting for admin and settings routes
  const isAdminRoute = pathname.startsWith('/settings') ||
                       pathname.includes('/admin') ||
                       pathname.startsWith('/api/admin');

  if (isAdminRoute && isIPWhitelistEnabled()) {
    const ipCheckResponse = requireIPWhitelist(req);
    if (ipCheckResponse) {
      // Log security event
      const clientIP = IPWhitelist.getClientIP(req);
      console.error(`[Security Alert] Unauthorized admin access attempt from IP: ${clientIP} to ${pathname}`);
      return ipCheckResponse;
    }
  }

  // Security headers
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Strict-Transport-Security (HSTS) - only in production with HTTPS
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Content Security Policy
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  res.headers.set('Content-Security-Policy', cspHeader);

  // For demo purposes, bypass auth and allow access to dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}