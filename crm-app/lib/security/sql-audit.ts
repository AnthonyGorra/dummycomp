/**
 * SQL Injection Prevention and Auditing
 *
 * This module provides utilities for auditing SQL queries and preventing SQL injection attacks.
 * When using Supabase, queries are generally safe due to parameterized queries,
 * but this module helps audit and validate query construction.
 */

import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Patterns that indicate potential SQL injection attempts
 */
const SQL_INJECTION_PATTERNS = [
  // SQL comments
  /--/,
  /\/\*/,
  /\*\//,
  /;/,

  // UNION attacks
  /\bUNION\b.*\bSELECT\b/i,

  // Boolean-based attacks
  /(\bOR\b|\bAND\b)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i,
  /\bOR\b\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?/i,

  // Time-based attacks
  /\b(SLEEP|BENCHMARK|WAITFOR)\b/i,

  // Stacked queries
  /;\s*(DROP|DELETE|UPDATE|INSERT|EXEC|EXECUTE)\b/i,

  // Common SQL keywords that shouldn't be in user input
  /\b(DROP|DELETE|TRUNCATE|ALTER|CREATE)\s+(TABLE|DATABASE|SCHEMA)/i,

  // System functions
  /\b(@@version|user\(|database\(|version\()/i,

  // Error-based injection
  /\b(EXTRACTVALUE|UPDATEXML|convert\(int)/i,
]

/**
 * Detect potential SQL injection attempts
 */
export function detectSQLInjection(input: string): {
  detected: boolean
  patterns: string[]
  severity: 'low' | 'medium' | 'high'
} {
  if (typeof input !== 'string') {
    return { detected: false, patterns: [], severity: 'low' }
  }

  const matchedPatterns: string[] = []

  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      matchedPatterns.push(pattern.source)
    }
  }

  const detected = matchedPatterns.length > 0

  // Determine severity
  let severity: 'low' | 'medium' | 'high' = 'low'
  if (matchedPatterns.length > 3) {
    severity = 'high'
  } else if (matchedPatterns.length > 1) {
    severity = 'medium'
  } else if (matchedPatterns.length === 1) {
    severity = 'low'
  }

  return { detected, patterns: matchedPatterns, severity }
}

/**
 * Audit log entry for SQL injection attempts
 */
export interface SQLAuditLog {
  timestamp: Date
  input: string
  patterns: string[]
  severity: 'low' | 'medium' | 'high'
  source: string
  ipAddress?: string
  userId?: string
}

/**
 * SQL Audit Logger
 */
class SQLAuditLogger {
  private logs: SQLAuditLog[] = []
  private maxLogs = 1000

  /**
   * Log a potential SQL injection attempt
   */
  log(entry: Omit<SQLAuditLog, 'timestamp'>): void {
    const logEntry: SQLAuditLog = {
      ...entry,
      timestamp: new Date(),
    }

    this.logs.push(logEntry)

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // Log to console for immediate visibility
    if (entry.severity === 'high') {
      console.error('[SQL INJECTION ATTEMPT - HIGH SEVERITY]', logEntry)
    } else if (entry.severity === 'medium') {
      console.warn('[SQL INJECTION ATTEMPT - MEDIUM SEVERITY]', logEntry)
    } else {
      console.log('[SQL INJECTION ATTEMPT - LOW SEVERITY]', logEntry)
    }
  }

  /**
   * Get recent audit logs
   */
  getLogs(limit = 100): SQLAuditLog[] {
    return this.logs.slice(-limit)
  }

  /**
   * Get logs by severity
   */
  getLogsBySeverity(severity: 'low' | 'medium' | 'high'): SQLAuditLog[] {
    return this.logs.filter((log) => log.severity === severity)
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = []
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }
}

export const sqlAuditLogger = new SQLAuditLogger()

/**
 * Validate and audit user input before using in queries
 */
export function auditAndValidateInput(
  input: string,
  source: string,
  metadata?: { ipAddress?: string; userId?: string }
): { valid: boolean; sanitized: string; reason?: string } {
  const detection = detectSQLInjection(input)

  if (detection.detected) {
    sqlAuditLogger.log({
      input,
      patterns: detection.patterns,
      severity: detection.severity,
      source,
      ...metadata,
    })

    return {
      valid: false,
      sanitized: '',
      reason: `Potential SQL injection detected (${detection.severity} severity)`,
    }
  }

  return {
    valid: true,
    sanitized: input,
  }
}

/**
 * Supabase query wrapper with SQL injection auditing
 */
export function createAuditedSupabaseClient(client: SupabaseClient) {
  return {
    /**
     * Safe select with auditing
     */
    safeSelect: async (
      table: string,
      filters: Record<string, any> = {},
      metadata?: { ipAddress?: string; userId?: string }
    ) => {
      // Audit all filter values
      for (const [key, value] of Object.entries(filters)) {
        if (typeof value === 'string') {
          const audit = auditAndValidateInput(value, `supabase.${table}.select`, metadata)
          if (!audit.valid) {
            throw new Error(`Invalid filter value for ${key}: ${audit.reason}`)
          }
        }
      }

      // Execute query
      let query = client.from(table).select()

      // Apply filters safely
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value)
      }

      return query
    },

    /**
     * Safe insert with auditing
     */
    safeInsert: async (
      table: string,
      data: Record<string, any>,
      metadata?: { ipAddress?: string; userId?: string }
    ) => {
      // Audit all string values
      const auditedData = { ...data }
      for (const [key, value] of Object.entries(auditedData)) {
        if (typeof value === 'string') {
          const audit = auditAndValidateInput(value, `supabase.${table}.insert`, metadata)
          if (!audit.valid) {
            throw new Error(`Invalid value for ${key}: ${audit.reason}`)
          }
        }
      }

      return client.from(table).insert(auditedData)
    },

    /**
     * Safe update with auditing
     */
    safeUpdate: async (
      table: string,
      data: Record<string, any>,
      filters: Record<string, any>,
      metadata?: { ipAddress?: string; userId?: string }
    ) => {
      // Audit all values
      for (const [key, value] of Object.entries({ ...data, ...filters })) {
        if (typeof value === 'string') {
          const audit = auditAndValidateInput(value, `supabase.${table}.update`, metadata)
          if (!audit.valid) {
            throw new Error(`Invalid value for ${key}: ${audit.reason}`)
          }
        }
      }

      let query = client.from(table).update(data)

      // Apply filters safely
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value)
      }

      return query
    },

    /**
     * Safe delete with auditing
     */
    safeDelete: async (
      table: string,
      filters: Record<string, any>,
      metadata?: { ipAddress?: string; userId?: string }
    ) => {
      // Audit all filter values
      for (const [key, value] of Object.entries(filters)) {
        if (typeof value === 'string') {
          const audit = auditAndValidateInput(value, `supabase.${table}.delete`, metadata)
          if (!audit.valid) {
            throw new Error(`Invalid filter value for ${key}: ${audit.reason}`)
          }
        }
      }

      let query = client.from(table).delete()

      // Apply filters safely
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value)
      }

      return query
    },

    /**
     * Access the original client for advanced use cases
     */
    raw: client,
  }
}

/**
 * Middleware to audit all request inputs
 */
export function auditRequestInputs(
  data: any,
  source: string,
  metadata?: { ipAddress?: string; userId?: string }
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  const auditValue = (value: any, path: string) => {
    if (typeof value === 'string') {
      const audit = auditAndValidateInput(value, `${source}.${path}`, metadata)
      if (!audit.valid) {
        errors.push(`${path}: ${audit.reason}`)
      }
    } else if (value !== null && typeof value === 'object') {
      for (const [key, val] of Object.entries(value)) {
        auditValue(val, path ? `${path}.${key}` : key)
      }
    }
  }

  auditValue(data, '')

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get audit statistics
 */
export function getAuditStatistics() {
  const logs = sqlAuditLogger.getLogs()
  const highSeverity = logs.filter((l) => l.severity === 'high').length
  const mediumSeverity = logs.filter((l) => l.severity === 'medium').length
  const lowSeverity = logs.filter((l) => l.severity === 'low').length

  return {
    total: logs.length,
    highSeverity,
    mediumSeverity,
    lowSeverity,
    recentLogs: logs.slice(-10),
  }
}
