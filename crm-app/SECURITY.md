# Security Features Documentation

This document outlines all security features implemented in the CRM application.

## Table of Contents

- [Overview](#overview)
- [Security Features](#security-features)
  - [Rate Limiting](#rate-limiting)
  - [CSRF Protection](#csrf-protection)
  - [Security Headers](#security-headers)
  - [Input Sanitization](#input-sanitization)
  - [SQL Injection Prevention](#sql-injection-prevention)
  - [XSS Protection](#xss-protection)
  - [Dependency Scanning](#dependency-scanning)
- [Configuration](#configuration)
- [API Security](#api-security)
- [Best Practices](#best-practices)
- [Security Auditing](#security-auditing)

## Overview

The CRM application implements multiple layers of security to protect against common web vulnerabilities and attacks.

## Security Features

### Rate Limiting

Protects against brute force attacks and DDoS by limiting the number of requests from a single source.

**Implementation:** `/lib/security/rate-limiter.ts`

#### Features:
- **Per-IP Rate Limiting**: Limits requests from individual IP addresses
- **Per-User Rate Limiting**: Limits requests from authenticated users
- **Per-API-Key Rate Limiting**: Separate limits for API key holders
- **Endpoint-Specific Limits**: Different limits for different endpoints

#### Configuration:

```typescript
// Default limits
{
  general: 120 requests/minute,
  api: 60 requests/minute per IP,
  auth: 5 requests/15 minutes per IP,
  webhook: 100 requests/minute
}
```

#### Custom Rate Limiting:

```typescript
import { RateLimiter } from '@/lib/security'

const customLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyPrefix: 'custom'
})
```

### CSRF Protection

Prevents Cross-Site Request Forgery attacks by validating tokens on state-changing requests.

**Implementation:** `/lib/security/csrf.ts`

#### Features:
- Automatic token generation for GET requests
- Token validation for POST, PUT, DELETE, PATCH requests
- HttpOnly cookies for token storage
- Timing-safe token comparison

#### Usage in Frontend:

```typescript
// Token is automatically set in cookie
// Include in requests via header
headers: {
  'X-CSRF-Token': getCookie('csrf-token')
}
```

#### Exempt Paths:

By default, these paths are exempt from CSRF protection:
- `/api/webhooks/*`
- `/api/health`

Configure in `/lib/security/config.ts`

### Security Headers

Implements comprehensive security headers to protect against various attacks.

**Implementation:** `/lib/security/headers.ts`

#### Headers Applied:

| Header | Value | Purpose |
|--------|-------|---------|
| Strict-Transport-Security | max-age=31536000 | Force HTTPS |
| Content-Security-Policy | (custom) | Prevent XSS |
| X-Frame-Options | SAMEORIGIN | Prevent clickjacking |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| Referrer-Policy | strict-origin-when-cross-origin | Control referrer info |
| Permissions-Policy | (restrictive) | Disable unnecessary features |
| X-XSS-Protection | 1; mode=block | Enable XSS filter |

#### Custom CSP:

```typescript
import { SecurityHeaders } from '@/lib/security'

const headers = new SecurityHeaders({
  customCSP: "default-src 'self'; script-src 'self' 'unsafe-inline'"
})
```

### Input Sanitization

Validates and sanitizes all user inputs to prevent injection attacks.

**Implementation:** `/lib/security/sanitization.ts`

#### Features:
- HTML sanitization
- SQL injection pattern removal
- XSS encoding
- Zod schema validation
- Request size limits

#### Usage:

```typescript
import { validateRequestBody, validationSchemas } from '@/lib/security'

const schema = z.object({
  email: validationSchemas.email,
  username: validationSchemas.username,
})

const validation = await validateRequestBody(request, schema)
if (!validation.success) {
  return validation.error
}
```

#### Available Schemas:
- `email`: Email validation
- `url`: URL validation
- `uuid`: UUID validation
- `phoneNumber`: Phone number validation
- `alphanumeric`: Alphanumeric strings
- `username`: Username validation
- `password`: Strong password validation
- `safeString`: XSS-safe strings
- `apiKey`: API key format

### SQL Injection Prevention

Detects and blocks SQL injection attempts with comprehensive auditing.

**Implementation:** `/lib/security/sql-audit.ts`

#### Features:
- Pattern-based injection detection
- Automatic audit logging
- Severity classification (low, medium, high)
- Safe Supabase query wrappers

#### Usage:

```typescript
import { auditAndValidateInput, createAuditedSupabaseClient } from '@/lib/security'
import { createClient } from '@supabase/supabase-js'

// Validate individual inputs
const result = auditAndValidateInput(userInput, 'api.endpoint', {
  ipAddress: clientIp,
  userId: userId
})

// Use audited Supabase client
const supabase = createClient(url, key)
const auditedClient = createAuditedSupabaseClient(supabase)

const data = await auditedClient.safeSelect('users', {
  id: userId
}, { ipAddress })
```

#### Audit Logs:

Access audit logs:
```typescript
import { sqlAuditLogger, getAuditStatistics } from '@/lib/security'

const stats = getAuditStatistics()
console.log(`High severity attempts: ${stats.highSeverity}`)
```

### XSS Protection

Comprehensive XSS protection with sanitization and detection.

**Implementation:** `/lib/security/xss-protection.ts`

#### Features:
- HTML escaping
- Dangerous tag removal
- Attribute sanitization
- URL protocol validation
- CSS sanitization
- Automatic detection and logging

#### Usage:

```typescript
import {
  sanitizeHTML,
  escapeHTML,
  auditAndSanitizeXSS
} from '@/lib/security'

// Basic sanitization
const safe = sanitizeHTML(userInput)

// With auditing
const result = auditAndSanitizeXSS(userInput, 'form.field', {
  ipAddress: clientIp
})
```

#### Safe Rendering:

```typescript
import { createSafeHTML } from '@/lib/security'

const safeContent = createSafeHTML(userContent, {
  allowedTags: ['p', 'strong', 'em'],
  removeAll: false
})
```

### Dependency Scanning

Automated vulnerability scanning for dependencies.

**Implementation:**
- `/scripts/check-vulnerabilities.js`
- `/scripts/security-audit.sh`
- `/.github/workflows/security-scan.yml`

#### Features:
- Automated npm audit
- Severity-based failure thresholds
- JSON report generation
- Slack notifications (optional)
- GitHub Actions integration

#### Commands:

```bash
# Run security audit
npm run security:audit

# Auto-fix vulnerabilities
npm run security:audit:fix

# Full security check
npm run security:check

# CI-friendly check (fails on high/critical)
npm run security:check:ci

# Comprehensive audit script
npm run security:full
```

#### CI/CD Integration:

The GitHub Actions workflow runs:
- Dependency vulnerability scan
- Code security analysis
- Secret scanning
- License compliance check

Triggered on:
- Push to main/develop/claude/* branches
- Pull requests
- Daily at 2 AM UTC
- Manual workflow dispatch

## Configuration

All security features can be configured in `/lib/security/config.ts`:

```typescript
export const securityConfig = {
  rateLimit: {
    enabled: true,
    // ... rate limit settings
  },
  csrf: {
    enabled: true,
    exemptPaths: ['/api/webhooks', '/api/health']
  },
  headers: {
    enabled: true,
    // ... header settings
  },
  validation: {
    enabled: true,
    sanitizeHTML: true,
    sanitizeSQL: true
  },
  sqlAudit: {
    enabled: true,
    logAttempts: true
  },
  xss: {
    enabled: true,
    logAttempts: true
  }
}
```

### Environment Variables:

Create a `.env` file based on `.env.example`:

```bash
# Required
CSRF_SECRET=your-strong-random-secret
VALID_API_KEYS=key1,key2

# Optional
RATE_LIMIT_ENABLED=true
SECURITY_HEADERS_ENABLED=true
VULN_FAIL_LEVEL=high
SLACK_SECURITY_WEBHOOK=https://hooks.slack.com/...
```

## API Security

### Securing API Routes:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  validateRequestBody,
  checkRequestSize,
  REQUEST_SIZE_LIMITS,
  getClientIp,
  auditAndSanitizeXSS,
  auditRequestInputs,
} from '@/lib/security'

const requestSchema = z.object({
  // Define your schema
})

export async function POST(request: NextRequest) {
  // 1. Check request size
  const sizeCheck = checkRequestSize(request, REQUEST_SIZE_LIMITS.MEDIUM)
  if (!sizeCheck.valid) return sizeCheck.error

  // 2. Validate request body
  const validation = await validateRequestBody(request, requestSchema)
  if (!validation.success) return validation.error

  // 3. Audit for injection attempts
  const clientIp = getClientIp(request)
  const auditResult = auditRequestInputs(
    validation.data,
    'api.endpoint',
    { ipAddress: clientIp }
  )

  if (!auditResult.valid) {
    return NextResponse.json(
      { error: 'Invalid input', details: auditResult.errors },
      { status: 400 }
    )
  }

  // 4. Process request safely
  // ...
}
```

### API Key Authentication:

Protected endpoints require API key in header:

```typescript
headers: {
  'X-API-Key': 'your-api-key'
}
```

Configure required paths in `/lib/security/config.ts`:

```typescript
apiKeys: {
  enabled: true,
  requiredForPaths: ['/api/webhooks'],
  validKeys: process.env.VALID_API_KEYS?.split(',') || []
}
```

## Best Practices

### 1. Input Validation
- Always validate user input with Zod schemas
- Use provided validation schemas for common types
- Sanitize HTML content before rendering

### 2. Authentication
- Use strong passwords (enforced by validation)
- Implement rate limiting on auth endpoints
- Never log sensitive data

### 3. API Security
- Require API keys for sensitive endpoints
- Validate all request bodies
- Check request sizes
- Audit all inputs

### 4. Database Security
- Use Supabase's built-in RLS (Row Level Security)
- Use audited query wrappers
- Never concatenate user input into queries
- Validate all filter parameters

### 5. Frontend Security
- Escape all user-generated content
- Include CSRF tokens in forms
- Use Content Security Policy
- Sanitize before rendering HTML

### 6. Dependencies
- Run `npm audit` regularly
- Keep dependencies updated
- Use automated scanning in CI/CD
- Review dependency licenses

### 7. Secrets Management
- Never commit secrets to git
- Use environment variables
- Rotate secrets regularly
- Use strong random generators

## Security Auditing

### Viewing Audit Logs:

```typescript
import {
  sqlAuditLogger,
  xssAuditLogger,
  getAuditStatistics
} from '@/lib/security'

// SQL injection attempts
const sqlLogs = sqlAuditLogger.getLogs(100)
const highSeverity = sqlAuditLogger.getLogsBySeverity('high')

// XSS attempts
const xssLogs = xssAuditLogger.getLogs(100)

// Statistics
const stats = getAuditStatistics()
console.log('Security Statistics:', stats)
```

### Monitoring:

1. **Application Logs**: Check console for security warnings
2. **Audit Logs**: Review SQL and XSS audit logs regularly
3. **GitHub Actions**: Monitor security scan results
4. **Vulnerability Reports**: Check `security-audit-results.json`

### Incident Response:

If a security incident is detected:

1. Check audit logs for details
2. Identify affected users/data
3. Block malicious IPs if needed
4. Rotate compromised secrets
5. Review and update security rules
6. Document and learn from incident

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Supabase Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

## Security Contacts

For security issues, please:
1. Do NOT open public GitHub issues
2. Contact the security team privately
3. Provide detailed reproduction steps
4. Allow time for patching before disclosure

---

**Last Updated:** 2025-11-18
**Version:** 1.0.0
