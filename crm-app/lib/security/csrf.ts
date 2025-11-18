import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export interface CSRFConfig {
  secret: string
  cookieName?: string
  headerName?: string
  tokenLength?: number
  cookieOptions?: {
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'strict' | 'lax' | 'none'
    maxAge?: number
    path?: string
  }
}

const DEFAULT_CONFIG: Partial<CSRFConfig> = {
  cookieName: 'csrf-token',
  headerName: 'x-csrf-token',
  tokenLength: 32,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  },
}

/**
 * CSRF Protection Manager
 */
export class CSRFProtection {
  private config: Required<CSRFConfig>

  constructor(config: CSRFConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      cookieOptions: {
        ...DEFAULT_CONFIG.cookieOptions,
        ...config.cookieOptions,
      },
    } as Required<CSRFConfig>
  }

  /**
   * Generate a CSRF token
   */
  generateToken(): string {
    return crypto.randomBytes(this.config.tokenLength).toString('hex')
  }

  /**
   * Create HMAC hash of token
   */
  private hashToken(token: string): string {
    return crypto
      .createHmac('sha256', this.config.secret)
      .update(token)
      .digest('hex')
  }

  /**
   * Verify CSRF token
   */
  verifyToken(token: string, hashedToken: string): boolean {
    if (!token || !hashedToken) {
      return false
    }

    try {
      const expectedHash = this.hashToken(token)
      const tokenBuffer = Buffer.from(hashedToken)
      const expectedBuffer = Buffer.from(expectedHash)

      if (tokenBuffer.length !== expectedBuffer.length) {
        return false
      }

      return crypto.timingSafeEqual(tokenBuffer, expectedBuffer)
    } catch (error) {
      console.error('CSRF token verification error:', error)
      return false
    }
  }

  /**
   * Set CSRF token in cookie
   */
  setTokenCookie(response: NextResponse, token: string): NextResponse {
    const hashedToken = this.hashToken(token)
    const cookieValue = `${token}:${hashedToken}`

    const cookieOptions = [
      `${this.config.cookieName}=${cookieValue}`,
      `Path=${this.config.cookieOptions.path}`,
      `Max-Age=${this.config.cookieOptions.maxAge}`,
      `SameSite=${this.config.cookieOptions.sameSite}`,
    ]

    if (this.config.cookieOptions.httpOnly) {
      cookieOptions.push('HttpOnly')
    }

    if (this.config.cookieOptions.secure) {
      cookieOptions.push('Secure')
    }

    response.headers.set('Set-Cookie', cookieOptions.join('; '))
    return response
  }

  /**
   * Get CSRF token from cookie
   */
  getTokenFromCookie(request: NextRequest): { token: string; hash: string } | null {
    const cookieValue = request.cookies.get(this.config.cookieName)?.value
    if (!cookieValue) {
      return null
    }

    const [token, hash] = cookieValue.split(':')
    if (!token || !hash) {
      return null
    }

    return { token, hash }
  }

  /**
   * Get CSRF token from request header
   */
  getTokenFromHeader(request: NextRequest): string | null {
    return request.headers.get(this.config.headerName) || null
  }

  /**
   * Verify request has valid CSRF token
   */
  verifyRequest(request: NextRequest): boolean {
    // Skip verification for safe methods
    const method = request.method.toUpperCase()
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true
    }

    // Get token from cookie
    const cookieData = this.getTokenFromCookie(request)
    if (!cookieData) {
      return false
    }

    // Get token from header
    const headerToken = this.getTokenFromHeader(request)
    if (!headerToken) {
      return false
    }

    // Verify tokens match
    if (headerToken !== cookieData.token) {
      return false
    }

    // Verify token hash
    return this.verifyToken(cookieData.token, cookieData.hash)
  }

  /**
   * Create CSRF error response
   */
  createErrorResponse(): NextResponse {
    return NextResponse.json(
      {
        error: 'Invalid CSRF token',
        message: 'CSRF token validation failed. Please refresh the page and try again.',
      },
      { status: 403 }
    )
  }
}

// Create default CSRF protection instance
export const csrfProtection = new CSRFProtection({
  secret: process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production',
})

/**
 * Middleware helper to generate and set CSRF token
 */
export function generateCSRFToken(response: NextResponse): {
  response: NextResponse
  token: string
} {
  const token = csrfProtection.generateToken()
  const updatedResponse = csrfProtection.setTokenCookie(response, token)

  // Also add token to response header for easy client access
  updatedResponse.headers.set('X-CSRF-Token', token)

  return {
    response: updatedResponse,
    token,
  }
}

/**
 * Middleware helper to verify CSRF token
 */
export function verifyCSRFToken(request: NextRequest): boolean {
  return csrfProtection.verifyRequest(request)
}

/**
 * Create CSRF protected response
 */
export function createCSRFProtectedResponse(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  // Skip for safe methods
  const method = request.method.toUpperCase()
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return generateCSRFToken(response).response
  }

  // Verify token for unsafe methods
  if (!verifyCSRFToken(request)) {
    return csrfProtection.createErrorResponse()
  }

  return response
}
