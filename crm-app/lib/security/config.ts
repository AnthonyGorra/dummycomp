/**
 * Security Configuration
 *
 * Central configuration for all security features
 */

export const securityConfig = {
  // Rate Limiting
  rateLimit: {
    enabled: true,
    general: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 120,
    },
    api: {
      perIp: {
        windowMs: 60 * 1000,
        maxRequests: 60,
      },
      perUser: {
        windowMs: 60 * 1000,
        maxRequests: 100,
      },
      perApiKey: {
        windowMs: 60 * 1000,
        maxRequests: 1000,
      },
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
    },
    webhook: {
      windowMs: 60 * 1000,
      maxRequests: 100,
    },
  },

  // CSRF Protection
  csrf: {
    enabled: true,
    secret: process.env.CSRF_SECRET || 'change-this-in-production',
    cookieName: 'csrf-token',
    headerName: 'x-csrf-token',
    exemptPaths: ['/api/webhooks', '/api/health'], // Paths that don't need CSRF
  },

  // Security Headers
  headers: {
    enabled: true,
    hsts: {
      enabled: true,
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    csp: {
      enabled: true,
      // Custom CSP can be defined here
    },
    frameOptions: {
      enabled: true,
      value: 'SAMEORIGIN',
    },
  },

  // Input Validation
  validation: {
    enabled: true,
    maxRequestSize: {
      default: 1024 * 100, // 100KB
      upload: 1024 * 1024 * 10, // 10MB
    },
    sanitizeHTML: true,
    sanitizeSQL: true,
  },

  // SQL Injection Prevention
  sqlAudit: {
    enabled: true,
    logAttempts: true,
    blockSuspicious: true,
  },

  // XSS Protection
  xss: {
    enabled: true,
    logAttempts: true,
    sanitizeResponses: true,
  },

  // Allowed Origins for CORS
  cors: {
    enabled: true,
    allowedOrigins: [
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      // Add production domains here
    ],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-API-Key',
      'X-Requested-With',
    ],
    credentials: true,
  },

  // API Key validation
  apiKeys: {
    enabled: true,
    requiredForPaths: ['/api/webhooks'], // Paths that require API key
    validKeys: process.env.VALID_API_KEYS?.split(',') || [],
  },
}

/**
 * Check if a path is exempt from CSRF protection
 */
export function isCSRFExempt(path: string): boolean {
  return securityConfig.csrf.exemptPaths.some((exemptPath) =>
    path.startsWith(exemptPath)
  )
}

/**
 * Check if a path requires API key
 */
export function requiresApiKey(path: string): boolean {
  return securityConfig.apiKeys.requiredForPaths.some((requiredPath) =>
    path.startsWith(requiredPath)
  )
}

/**
 * Validate API key
 */
export function isValidApiKey(apiKey: string): boolean {
  if (!securityConfig.apiKeys.enabled) {
    return true
  }

  return securityConfig.apiKeys.validKeys.includes(apiKey)
}

/**
 * Check if origin is allowed for CORS
 */
export function isAllowedOrigin(origin: string): boolean {
  if (!securityConfig.cors.enabled) {
    return true
  }

  return securityConfig.cors.allowedOrigins.includes(origin)
}
