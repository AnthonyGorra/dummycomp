import { NextResponse } from 'next/server'

export interface SecurityHeadersConfig {
  enableHSTS?: boolean
  enableCSP?: boolean
  enableXFrameOptions?: boolean
  enableXContentTypeOptions?: boolean
  enableReferrerPolicy?: boolean
  enablePermissionsPolicy?: boolean
  customCSP?: string
  customHeaders?: Record<string, string>
}

const DEFAULT_CONFIG: SecurityHeadersConfig = {
  enableHSTS: true,
  enableCSP: true,
  enableXFrameOptions: true,
  enableXContentTypeOptions: true,
  enableReferrerPolicy: true,
  enablePermissionsPolicy: true,
}

/**
 * Content Security Policy configuration
 */
export const generateCSP = (customCSP?: string): string => {
  if (customCSP) {
    return customCSP
  }

  // Default CSP policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval and unsafe-inline for dev
    "style-src 'self' 'unsafe-inline'", // Tailwind and styled components require unsafe-inline
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.anthropic.com https://*.supabase.co wss://*.supabase.co",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ]

  return cspDirectives.join('; ')
}

/**
 * Security Headers Manager
 */
export class SecurityHeaders {
  private config: SecurityHeadersConfig

  constructor(config: SecurityHeadersConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    }
  }

  /**
   * Apply security headers to response
   */
  applyHeaders(response: NextResponse): NextResponse {
    // HTTP Strict Transport Security (HSTS)
    if (this.config.enableHSTS) {
      response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      )
    }

    // Content Security Policy (CSP)
    if (this.config.enableCSP) {
      const csp = generateCSP(this.config.customCSP)
      response.headers.set('Content-Security-Policy', csp)
      // Also set report-only for monitoring
      response.headers.set('Content-Security-Policy-Report-Only', csp)
    }

    // X-Frame-Options (prevent clickjacking)
    if (this.config.enableXFrameOptions) {
      response.headers.set('X-Frame-Options', 'SAMEORIGIN')
    }

    // X-Content-Type-Options (prevent MIME sniffing)
    if (this.config.enableXContentTypeOptions) {
      response.headers.set('X-Content-Type-Options', 'nosniff')
    }

    // Referrer Policy
    if (this.config.enableReferrerPolicy) {
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    }

    // Permissions Policy (formerly Feature Policy)
    if (this.config.enablePermissionsPolicy) {
      const permissionsPolicy = [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'interest-cohort=()', // Disable FLoC
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'accelerometer=()',
        'gyroscope=()',
      ].join(', ')
      response.headers.set('Permissions-Policy', permissionsPolicy)
    }

    // X-XSS-Protection (legacy, but still useful for older browsers)
    response.headers.set('X-XSS-Protection', '1; mode=block')

    // X-DNS-Prefetch-Control
    response.headers.set('X-DNS-Prefetch-Control', 'on')

    // X-Download-Options (IE specific)
    response.headers.set('X-Download-Options', 'noopen')

    // X-Permitted-Cross-Domain-Policies
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')

    // Cross-Origin-Embedder-Policy
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')

    // Cross-Origin-Opener-Policy
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')

    // Cross-Origin-Resource-Policy
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')

    // Apply custom headers
    if (this.config.customHeaders) {
      Object.entries(this.config.customHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
    }

    return response
  }

  /**
   * Get all security headers as object
   */
  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}

    if (this.config.enableHSTS) {
      headers['Strict-Transport-Security'] =
        'max-age=31536000; includeSubDomains; preload'
    }

    if (this.config.enableCSP) {
      const csp = generateCSP(this.config.customCSP)
      headers['Content-Security-Policy'] = csp
    }

    if (this.config.enableXFrameOptions) {
      headers['X-Frame-Options'] = 'SAMEORIGIN'
    }

    if (this.config.enableXContentTypeOptions) {
      headers['X-Content-Type-Options'] = 'nosniff'
    }

    if (this.config.enableReferrerPolicy) {
      headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    }

    if (this.config.enablePermissionsPolicy) {
      headers['Permissions-Policy'] = [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'interest-cohort=()',
        'payment=()',
        'usb=()',
      ].join(', ')
    }

    headers['X-XSS-Protection'] = '1; mode=block'
    headers['X-DNS-Prefetch-Control'] = 'on'
    headers['X-Download-Options'] = 'noopen'
    headers['X-Permitted-Cross-Domain-Policies'] = 'none'

    if (this.config.customHeaders) {
      Object.assign(headers, this.config.customHeaders)
    }

    return headers
  }
}

// Create default security headers instance
export const securityHeaders = new SecurityHeaders()

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  return securityHeaders.applyHeaders(response)
}
