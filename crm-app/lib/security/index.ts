/**
 * Security Module - Central Export
 *
 * This module exports all security-related utilities and middleware
 * for easy import throughout the application.
 */

// Rate Limiting
export {
  RateLimiter,
  rateLimiters,
  getClientIp,
  getUserId,
  getApiKey,
  createRateLimitResponse,
  addRateLimitHeaders,
  type RateLimitConfig,
  type RateLimitResult,
} from './rate-limiter'

// CSRF Protection
export {
  CSRFProtection,
  csrfProtection,
  generateCSRFToken,
  verifyCSRFToken,
  createCSRFProtectedResponse,
  type CSRFConfig,
} from './csrf'

// Security Headers
export {
  SecurityHeaders,
  securityHeaders,
  applySecurityHeaders,
  generateCSP,
  type SecurityHeadersConfig,
} from './headers'

// Input Sanitization and Validation
export {
  sanitizeHTML as sanitizeHTMLInput,
  sanitizeSQL,
  encodeHTML,
  sanitizeObject,
  validationSchemas,
  validateRequestBody,
  validateQueryParams,
  createValidationMiddleware,
  checkRequestSize,
  REQUEST_SIZE_LIMITS,
} from './sanitization'

// SQL Injection Prevention
export {
  detectSQLInjection,
  sqlAuditLogger,
  auditAndValidateInput,
  createAuditedSupabaseClient,
  auditRequestInputs,
  getAuditStatistics,
  type SQLAuditLog,
} from './sql-audit'

// XSS Protection
export {
  escapeHTML,
  unescapeHTML,
  sanitizeHTML,
  sanitizeURL,
  sanitizeCSS,
  createSafeHTML,
  sanitizeJSON,
  safeAttributes,
  detectXSS,
  auditAndSanitizeXSS,
  xssAuditLogger,
  cspViolationLogger,
  type CSPViolation,
} from './xss-protection'
