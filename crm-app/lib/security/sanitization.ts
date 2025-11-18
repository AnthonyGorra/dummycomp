import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

/**
 * HTML sanitization - Remove dangerous HTML tags and attributes
 */
export function sanitizeHTML(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove iframe tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')

  // Remove object and embed tags
  sanitized = sanitized.replace(/<(object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '')

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '')

  // Remove data: protocol from attributes (except images)
  sanitized = sanitized.replace(/(<(?!img)[^>]+)data:/gi, '$1')

  return sanitized
}

/**
 * SQL injection prevention - Sanitize inputs that might be used in SQL queries
 */
export function sanitizeSQL(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  // Remove SQL comments
  let sanitized = input.replace(/--[^\n]*/g, '')
  sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '')

  // Remove common SQL injection patterns
  sanitized = sanitized.replace(/(\bOR\b|\bAND\b)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/gi, '')

  // Remove UNION statements
  sanitized = sanitized.replace(/\bUNION\b.*?\bSELECT\b/gi, '')

  // Remove DROP, DELETE, UPDATE, INSERT statements
  sanitized = sanitized.replace(/\b(DROP|DELETE|UPDATE|INSERT|EXEC|EXECUTE)\b/gi, '')

  return sanitized
}

/**
 * XSS prevention - Encode special characters
 */
export function encodeHTML(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  const entityMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  }

  return input.replace(/[&<>"'`=\/]/g, (char) => entityMap[char])
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options: {
    sanitizeHTML?: boolean
    sanitizeSQL?: boolean
    encodeHTML?: boolean
  } = {}
): T {
  const { sanitizeHTML: doSanitizeHTML, sanitizeSQL: doSanitizeSQL, encodeHTML: doEncodeHTML } = options

  const sanitized: any = Array.isArray(obj) ? [] : {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      let sanitizedValue = value

      if (doSanitizeHTML) {
        sanitizedValue = sanitizeHTML(sanitizedValue)
      }

      if (doSanitizeSQL) {
        sanitizedValue = sanitizeSQL(sanitizedValue)
      }

      if (doEncodeHTML) {
        sanitizedValue = encodeHTML(sanitizedValue)
      }

      sanitized[key] = sanitizedValue
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, options)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Validation schemas for common inputs
 */
export const validationSchemas = {
  email: z.string().email().max(255),

  url: z.string().url().max(2048),

  uuid: z.string().uuid(),

  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/),

  alphanumeric: z.string().regex(/^[a-zA-Z0-9]+$/),

  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),

  password: z.string().min(8).max(128).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  ),

  safeString: z.string().max(1000).refine(
    (val) => !/<script|javascript:|on\w+=/i.test(val),
    'String contains potentially unsafe content'
  ),

  apiKey: z.string().min(32).max(128).regex(/^[a-zA-Z0-9_-]+$/),

  positiveInteger: z.number().int().positive(),

  nonNegativeInteger: z.number().int().nonnegative(),
}

/**
 * Validate request body against schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
  try {
    const body = await request.json()
    const validated = schema.parse(body)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        ),
      }
    }

    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      ),
    }
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: NextResponse } {
  try {
    const { searchParams } = new URL(request.url)
    const params: Record<string, any> = {}

    searchParams.forEach((value, key) => {
      params[key] = value
    })

    const validated = schema.parse(params)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Query parameter validation failed',
            details: error.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        ),
      }
    }

    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      ),
    }
  }
}

/**
 * Sanitize and validate middleware helper
 */
export function createValidationMiddleware<T>(
  schema: z.ZodSchema<T>,
  options: {
    sanitizeHTML?: boolean
    sanitizeSQL?: boolean
  } = {}
) {
  return async (request: NextRequest) => {
    // Validate the request body
    const validation = await validateRequestBody(request, schema)

    if (!validation.success) {
      return validation.error
    }

    // Sanitize the data if requested
    let data = validation.data
    if (options.sanitizeHTML || options.sanitizeSQL) {
      data = sanitizeObject(data as any, options)
    }

    return { success: true as const, data }
  }
}

/**
 * Common request body size limits
 */
export const REQUEST_SIZE_LIMITS = {
  SMALL: 1024 * 10, // 10KB
  MEDIUM: 1024 * 100, // 100KB
  LARGE: 1024 * 1024, // 1MB
  XLARGE: 1024 * 1024 * 10, // 10MB
}

/**
 * Check request body size
 */
export function checkRequestSize(
  request: NextRequest,
  maxSize: number
): { valid: true } | { valid: false; error: NextResponse } {
  const contentLength = request.headers.get('content-length')

  if (contentLength && parseInt(contentLength, 10) > maxSize) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          error: 'Request too large',
          message: `Request body exceeds maximum size of ${maxSize} bytes`,
        },
        { status: 413 }
      ),
    }
  }

  return { valid: true }
}
