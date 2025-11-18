/**
 * XSS (Cross-Site Scripting) Protection Enhancements
 *
 * This module provides comprehensive XSS protection utilities including
 * HTML sanitization, content escaping, and safe rendering helpers.
 */

/**
 * Comprehensive HTML entity map
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
  '\n': '&#10;',
  '\r': '&#13;',
}

/**
 * Dangerous HTML tags that should be removed
 */
const DANGEROUS_TAGS = [
  'script',
  'iframe',
  'object',
  'embed',
  'applet',
  'meta',
  'link',
  'style',
  'base',
  'form',
  'input',
  'button',
  'textarea',
  'select',
]

/**
 * Dangerous HTML attributes
 */
const DANGEROUS_ATTRIBUTES = [
  'onclick',
  'ondblclick',
  'onmousedown',
  'onmouseup',
  'onmouseover',
  'onmousemove',
  'onmouseout',
  'onmouseenter',
  'onmouseleave',
  'onload',
  'onerror',
  'onabort',
  'onblur',
  'onchange',
  'onfocus',
  'onreset',
  'onsubmit',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onresize',
  'onscroll',
  'onunload',
  'onbeforeunload',
  'ondrag',
  'ondrop',
  'oncopy',
  'oncut',
  'onpaste',
  'oncontextmenu',
  'oninput',
  'oninvalid',
  'onsearch',
  'ontoggle',
  'onwheel',
  'onanimationend',
  'onanimationiteration',
  'onanimationstart',
  'ontransitionend',
]

/**
 * Dangerous URL protocols
 */
const DANGEROUS_PROTOCOLS = [
  'javascript:',
  'data:text/html',
  'vbscript:',
  'file:',
  'about:',
]

/**
 * Escape HTML entities
 */
export function escapeHTML(input: string): string {
  if (typeof input !== 'string') {
    return String(input)
  }

  return input.replace(/[&<>"'`=\/\n\r]/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * Unescape HTML entities (use with caution)
 */
export function unescapeHTML(input: string): string {
  if (typeof input !== 'string') {
    return String(input)
  }

  const reverseMap: Record<string, string> = {}
  for (const [key, value] of Object.entries(HTML_ENTITIES)) {
    reverseMap[value] = key
  }

  return input.replace(/&[#\w]+;/g, (entity) => reverseMap[entity] || entity)
}

/**
 * Remove dangerous HTML tags and attributes
 */
export function sanitizeHTML(html: string): string {
  if (typeof html !== 'string') {
    return ''
  }

  let sanitized = html

  // Remove dangerous tags and their content
  for (const tag of DANGEROUS_TAGS) {
    const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!</${tag}>)<[^<]*)*</${tag}>`, 'gi')
    sanitized = sanitized.replace(regex, '')
    // Also remove self-closing tags
    const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*/>`, 'gi')
    sanitized = sanitized.replace(selfClosingRegex, '')
  }

  // Remove dangerous attributes
  for (const attr of DANGEROUS_ATTRIBUTES) {
    // Match attribute with single quotes
    sanitized = sanitized.replace(
      new RegExp(`\\s*${attr}\\s*=\\s*['"][^'"]*['"]`, 'gi'),
      ''
    )
    // Match attribute with double quotes
    sanitized = sanitized.replace(
      new RegExp(`\\s*${attr}\\s*=\\s*[^\\s>]*`, 'gi'),
      ''
    )
  }

  // Remove dangerous protocols from href and src attributes
  for (const protocol of DANGEROUS_PROTOCOLS) {
    sanitized = sanitized.replace(
      new RegExp(`(href|src)\\s*=\\s*['"]?${protocol}[^'"\\s>]*['"]?`, 'gi'),
      ''
    )
  }

  return sanitized
}

/**
 * Sanitize URL to prevent XSS
 */
export function sanitizeURL(url: string): string {
  if (typeof url !== 'string') {
    return ''
  }

  // Remove whitespace
  const trimmed = url.trim()

  // Check for dangerous protocols
  for (const protocol of DANGEROUS_PROTOCOLS) {
    if (trimmed.toLowerCase().startsWith(protocol.toLowerCase())) {
      return ''
    }
  }

  // Encode special characters
  try {
    const parsed = new URL(trimmed)
    return parsed.toString()
  } catch {
    // If URL parsing fails, return empty string
    return ''
  }
}

/**
 * Sanitize CSS to prevent XSS
 */
export function sanitizeCSS(css: string): string {
  if (typeof css !== 'string') {
    return ''
  }

  let sanitized = css

  // Remove javascript: and other dangerous protocols
  sanitized = sanitized.replace(/javascript:/gi, '')
  sanitized = sanitized.replace(/vbscript:/gi, '')
  sanitized = sanitized.replace(/data:text\/html/gi, '')

  // Remove expression() which can execute JavaScript in old IE
  sanitized = sanitized.replace(/expression\s*\([^)]*\)/gi, '')

  // Remove @import which could load external stylesheets
  sanitized = sanitized.replace(/@import/gi, '')

  // Remove behavior property (IE specific)
  sanitized = sanitized.replace(/behavior\s*:/gi, '')

  return sanitized
}

/**
 * Create safe HTML content for rendering
 */
export function createSafeHTML(
  content: string,
  options: {
    allowedTags?: string[]
    allowedAttributes?: string[]
    removeAll?: boolean
  } = {}
): string {
  if (options.removeAll) {
    return escapeHTML(content)
  }

  const sanitized = sanitizeHTML(content)

  // If specific tags are allowed, only keep those
  if (options.allowedTags && options.allowedTags.length > 0) {
    // This is a simple implementation - in production, use a library like DOMPurify
    return sanitized
  }

  return sanitized
}

/**
 * Sanitize JSON to prevent XSS in JSON responses
 */
export function sanitizeJSON(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'string') {
    return escapeHTML(obj)
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeJSON)
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[escapeHTML(key)] = sanitizeJSON(value)
    }
    return sanitized
  }

  return obj
}

/**
 * Content Security Policy violation reporter
 */
export interface CSPViolation {
  documentURI: string
  violatedDirective: string
  effectiveDirective: string
  originalPolicy: string
  blockedURI: string
  statusCode: number
  sourceFile?: string
  lineNumber?: number
  columnNumber?: number
}

class CSPViolationLogger {
  private violations: CSPViolation[] = []
  private maxViolations = 100

  log(violation: CSPViolation): void {
    this.violations.push(violation)

    if (this.violations.length > this.maxViolations) {
      this.violations.shift()
    }

    console.warn('[CSP VIOLATION]', violation)
  }

  getViolations(limit = 50): CSPViolation[] {
    return this.violations.slice(-limit)
  }

  clear(): void {
    this.violations = []
  }
}

export const cspViolationLogger = new CSPViolationLogger()

/**
 * Safe attribute renderer for React/JSX
 */
export function safeAttributes(attrs: Record<string, any>): Record<string, any> {
  const safe: Record<string, any> = {}

  for (const [key, value] of Object.entries(attrs)) {
    // Skip dangerous attributes
    if (DANGEROUS_ATTRIBUTES.includes(key.toLowerCase())) {
      continue
    }

    // Sanitize URL attributes
    if (['href', 'src', 'action', 'formaction'].includes(key.toLowerCase())) {
      safe[key] = sanitizeURL(String(value))
    }
    // Sanitize style attribute
    else if (key.toLowerCase() === 'style') {
      if (typeof value === 'string') {
        safe[key] = sanitizeCSS(value)
      } else {
        safe[key] = value
      }
    }
    // Escape other string attributes
    else if (typeof value === 'string') {
      safe[key] = escapeHTML(value)
    } else {
      safe[key] = value
    }
  }

  return safe
}

/**
 * Detect potential XSS attempts
 */
export function detectXSS(input: string): {
  detected: boolean
  patterns: string[]
  severity: 'low' | 'medium' | 'high'
} {
  if (typeof input !== 'string') {
    return { detected: false, patterns: [], severity: 'low' }
  }

  const xssPatterns = [
    { pattern: /<script/i, severity: 'high' as const },
    { pattern: /javascript:/i, severity: 'high' as const },
    { pattern: /on\w+\s*=/i, severity: 'high' as const },
    { pattern: /<iframe/i, severity: 'high' as const },
    { pattern: /<object/i, severity: 'medium' as const },
    { pattern: /<embed/i, severity: 'medium' as const },
    { pattern: /eval\(/i, severity: 'high' as const },
    { pattern: /expression\(/i, severity: 'medium' as const },
    { pattern: /vbscript:/i, severity: 'high' as const },
    { pattern: /data:text\/html/i, severity: 'high' as const },
  ]

  const matches: { pattern: string; severity: 'low' | 'medium' | 'high' }[] = []

  for (const { pattern, severity } of xssPatterns) {
    if (pattern.test(input)) {
      matches.push({ pattern: pattern.source, severity })
    }
  }

  const detected = matches.length > 0

  // Determine overall severity
  let overallSeverity: 'low' | 'medium' | 'high' = 'low'
  if (matches.some((m) => m.severity === 'high')) {
    overallSeverity = 'high'
  } else if (matches.some((m) => m.severity === 'medium')) {
    overallSeverity = 'medium'
  }

  return {
    detected,
    patterns: matches.map((m) => m.pattern),
    severity: overallSeverity,
  }
}

/**
 * XSS audit logger
 */
interface XSSAuditLog {
  timestamp: Date
  input: string
  patterns: string[]
  severity: 'low' | 'medium' | 'high'
  source: string
  ipAddress?: string
  userId?: string
}

class XSSAuditLogger {
  private logs: XSSAuditLog[] = []
  private maxLogs = 1000

  log(entry: Omit<XSSAuditLog, 'timestamp'>): void {
    const logEntry: XSSAuditLog = {
      ...entry,
      timestamp: new Date(),
    }

    this.logs.push(logEntry)

    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    if (entry.severity === 'high') {
      console.error('[XSS ATTEMPT - HIGH SEVERITY]', logEntry)
    } else if (entry.severity === 'medium') {
      console.warn('[XSS ATTEMPT - MEDIUM SEVERITY]', logEntry)
    }
  }

  getLogs(limit = 100): XSSAuditLog[] {
    return this.logs.slice(-limit)
  }

  clear(): void {
    this.logs = []
  }
}

export const xssAuditLogger = new XSSAuditLogger()

/**
 * Audit and sanitize input for XSS
 */
export function auditAndSanitizeXSS(
  input: string,
  source: string,
  metadata?: { ipAddress?: string; userId?: string }
): { sanitized: string; detected: boolean } {
  const detection = detectXSS(input)

  if (detection.detected) {
    xssAuditLogger.log({
      input,
      patterns: detection.patterns,
      severity: detection.severity,
      source,
      ...metadata,
    })
  }

  return {
    sanitized: sanitizeHTML(input),
    detected: detection.detected,
  }
}
