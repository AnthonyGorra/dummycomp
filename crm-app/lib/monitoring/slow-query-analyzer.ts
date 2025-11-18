/**
 * Slow Query Logging and Analysis
 *
 * Identifies, logs, and analyzes slow database queries to help
 * optimize database performance.
 */

import { SupabaseClient } from '@supabase/supabase-js'

// Configuration
const SLOW_QUERY_CONFIG = {
  enabled: process.env.ENABLE_SLOW_QUERY_LOGGING !== 'false',
  threshold: parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '1000'),
  captureStackTrace: process.env.CAPTURE_SLOW_QUERY_STACK_TRACE === 'true',
  captureQueryPlan: process.env.CAPTURE_QUERY_PLAN === 'true',
}

// Slow query log entry
interface SlowQueryLog {
  id: string
  query: string
  table: string
  operation: string
  duration: number
  timestamp: Date
  stackTrace?: string
  queryPlan?: any
  parameters?: any
  userId?: string
  rowsReturned?: number
  recommendation?: string
}

// Query analysis result
interface QueryAnalysis {
  query: string
  issues: string[]
  recommendations: string[]
  estimatedImprovement: string
  suggestedIndexes?: string[]
}

// Storage
const slowQueryLog: SlowQueryLog[] = []
const MAX_LOG_SIZE = 500

// Query pattern statistics
const queryPatterns = new Map<string, {
  count: number
  totalDuration: number
  avgDuration: number
  maxDuration: number
  examples: string[]
}>()

/**
 * Slow Query Analyzer Class
 */
export class SlowQueryAnalyzer {
  private client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  /**
   * Log a slow query
   */
  logSlowQuery(
    query: string,
    table: string,
    operation: string,
    duration: number,
    options?: {
      userId?: string
      parameters?: any
      rowsReturned?: number
    }
  ): SlowQueryLog {
    if (!SLOW_QUERY_CONFIG.enabled || duration < SLOW_QUERY_CONFIG.threshold) {
      return null as any
    }

    const logEntry: SlowQueryLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      query,
      table,
      operation,
      duration,
      timestamp: new Date(),
      userId: options?.userId,
      parameters: options?.parameters,
      rowsReturned: options?.rowsReturned,
    }

    // Capture stack trace if enabled
    if (SLOW_QUERY_CONFIG.captureStackTrace) {
      const error = new Error()
      logEntry.stackTrace = error.stack
    }

    // Analyze query and add recommendation
    const analysis = this.analyzeQuery(query, table, operation, duration)
    if (analysis.recommendations.length > 0) {
      logEntry.recommendation = analysis.recommendations[0]
    }

    // Add to log
    slowQueryLog.push(logEntry)

    // Maintain max log size
    if (slowQueryLog.length > MAX_LOG_SIZE) {
      slowQueryLog.shift()
    }

    // Update pattern statistics
    this.updatePatternStats(table, operation, duration, query)

    // Log to console
    console.warn('🐌 Slow query detected:', {
      table,
      operation,
      duration: `${duration}ms`,
      recommendation: logEntry.recommendation,
    })

    // Send to monitoring service
    this.sendToMonitoringService(logEntry)

    return logEntry
  }

  /**
   * Analyze a query and provide recommendations
   */
  analyzeQuery(
    query: string,
    table: string,
    operation: string,
    duration: number
  ): QueryAnalysis {
    const issues: string[] = []
    const recommendations: string[] = []
    const suggestedIndexes: string[] = []

    // Check for common performance issues
    const queryLower = query.toLowerCase()

    // Issue: Missing indexes on filtered columns
    if (queryLower.includes('where') || queryLower.includes('eq(')) {
      issues.push('Query uses filtering without guaranteed index coverage')
      recommendations.push('Consider adding composite indexes for frequently filtered columns')

      // Extract potential index columns
      const whereMatch = queryLower.match(/where\s+(\w+)\s*=/i)
      if (whereMatch) {
        suggestedIndexes.push(`CREATE INDEX idx_${table}_${whereMatch[1]} ON ${table}(${whereMatch[1]})`)
      }
    }

    // Issue: Sorting without index
    if (queryLower.includes('order') || queryLower.includes('order(')) {
      const orderMatch = queryLower.match(/order\s+by\s+(\w+)/i) ||
                        queryLower.match(/order\('([^']+)'/i)
      if (orderMatch) {
        issues.push('Query uses sorting which may benefit from an index')
        recommendations.push(`Add index on ${orderMatch[1]} for faster sorting`)
        suggestedIndexes.push(`CREATE INDEX idx_${table}_${orderMatch[1]} ON ${table}(${orderMatch[1]} DESC)`)
      }
    }

    // Issue: Large result set
    if (!queryLower.includes('limit')) {
      issues.push('Query does not use LIMIT - may return large result sets')
      recommendations.push('Add LIMIT clause to restrict result set size')
    }

    // Issue: SELECT *
    if (queryLower.includes('select *') || queryLower.includes("select('*')")) {
      issues.push('Query selects all columns')
      recommendations.push('Select only required columns to reduce data transfer')
    }

    // Issue: Multiple joins
    const joinCount = (queryLower.match(/join/g) || []).length
    if (joinCount > 2) {
      issues.push(`Query has ${joinCount} joins which may be slow`)
      recommendations.push('Consider denormalizing data or using materialized views')
    }

    // Issue: Subqueries
    if (queryLower.includes('in (select')) {
      issues.push('Query uses subqueries which can be slow')
      recommendations.push('Consider rewriting with JOINs or using CTEs')
    }

    // Issue: LIKE with leading wildcard
    if (queryLower.includes("like '%")) {
      issues.push('Query uses LIKE with leading wildcard - cannot use index')
      recommendations.push('Use full-text search or trigram indexes for pattern matching')
    }

    // Estimate improvement potential
    let estimatedImprovement = 'Unknown'
    if (issues.length === 0) {
      estimatedImprovement = 'Query appears well-optimized'
    } else if (duration > 5000) {
      estimatedImprovement = '50-90% faster with proper indexes'
    } else if (duration > 2000) {
      estimatedImprovement = '30-50% faster with optimization'
    } else {
      estimatedImprovement = '10-30% faster with minor tweaks'
    }

    return {
      query,
      issues,
      recommendations,
      estimatedImprovement,
      suggestedIndexes: suggestedIndexes.length > 0 ? suggestedIndexes : undefined,
    }
  }

  /**
   * Update query pattern statistics
   */
  private updatePatternStats(
    table: string,
    operation: string,
    duration: number,
    query: string
  ) {
    const pattern = `${table}.${operation}`
    const existing = queryPatterns.get(pattern) || {
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
      maxDuration: 0,
      examples: [],
    }

    existing.count++
    existing.totalDuration += duration
    existing.avgDuration = existing.totalDuration / existing.count
    existing.maxDuration = Math.max(existing.maxDuration, duration)

    // Keep a few example queries
    if (existing.examples.length < 3) {
      existing.examples.push(query)
    }

    queryPatterns.set(pattern, existing)
  }

  /**
   * Send to monitoring service
   */
  private sendToMonitoringService(logEntry: SlowQueryLog) {
    // Implement based on your monitoring service
    // Example: Send to Datadog, New Relic, custom endpoint, etc.

    const metricsEndpoint = process.env.METRICS_ENDPOINT
    if (metricsEndpoint) {
      fetch(metricsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'slow_query',
          ...logEntry,
        }),
      }).catch(console.error)
    }
  }

  /**
   * Get PostgreSQL query execution plan
   */
  async getQueryPlan(query: string): Promise<any> {
    if (!SLOW_QUERY_CONFIG.captureQueryPlan) {
      return null
    }

    try {
      // This requires direct PostgreSQL access, not available through Supabase client
      // Would need to use pg library directly
      // const plan = await client.query(`EXPLAIN ANALYZE ${query}`)
      // return plan.rows

      console.warn('Query plan capture requires direct PostgreSQL access')
      return null
    } catch (error) {
      console.error('Failed to get query plan:', error)
      return null
    }
  }
}

/**
 * Get slow query logs
 */
export function getSlowQueries(options?: {
  limit?: number
  table?: string
  minDuration?: number
}): SlowQueryLog[] {
  const { limit = 50, table, minDuration } = options || {}

  let queries = slowQueryLog

  if (table) {
    queries = queries.filter(q => q.table === table)
  }

  if (minDuration) {
    queries = queries.filter(q => q.duration >= minDuration)
  }

  return queries.slice(-limit).reverse()
}

/**
 * Get query pattern statistics
 */
export function getQueryPatternStats() {
  return Array.from(queryPatterns.entries())
    .map(([pattern, stats]) => ({
      pattern,
      ...stats,
    }))
    .sort((a, b) => b.avgDuration - a.avgDuration)
}

/**
 * Get slow query report
 */
export function getSlowQueryReport() {
  const queries = getSlowQueries({ limit: 100 })

  // Group by table
  const byTable = queries.reduce((acc, q) => {
    if (!acc[q.table]) {
      acc[q.table] = []
    }
    acc[q.table].push(q)
    return acc
  }, {} as Record<string, SlowQueryLog[]>)

  // Generate statistics
  const stats = {
    totalSlowQueries: queries.length,
    avgDuration: queries.reduce((sum, q) => sum + q.duration, 0) / queries.length || 0,
    maxDuration: Math.max(...queries.map(q => q.duration), 0),
    byTable: Object.entries(byTable).map(([table, tableQueries]) => ({
      table,
      count: tableQueries.length,
      avgDuration: tableQueries.reduce((sum, q) => sum + q.duration, 0) / tableQueries.length,
      slowest: Math.max(...tableQueries.map(q => q.duration)),
    })),
    patterns: getQueryPatternStats(),
  }

  // Get unique recommendations
  const recommendations = new Set<string>()
  queries.forEach(q => {
    if (q.recommendation) {
      recommendations.add(q.recommendation)
    }
  })

  return {
    summary: stats,
    recommendations: Array.from(recommendations),
    queries: queries.slice(0, 20), // Top 20 slowest
  }
}

/**
 * Generate optimization suggestions
 */
export function generateOptimizationSuggestions(): string[] {
  const patterns = getQueryPatternStats()
  const suggestions: string[] = []

  patterns.forEach(pattern => {
    if (pattern.avgDuration > SLOW_QUERY_CONFIG.threshold) {
      suggestions.push(
        `Optimize ${pattern.pattern}: Average duration ${pattern.avgDuration.toFixed(0)}ms ` +
        `(${pattern.count} occurrences)`
      )
    }
  })

  // Analyze query logs for common issues
  const queries = getSlowQueries()
  const issueCount = {
    noLimit: 0,
    selectAll: 0,
    noIndex: 0,
    multipleJoins: 0,
  }

  queries.forEach(q => {
    if (!q.query.toLowerCase().includes('limit')) issueCount.noLimit++
    if (q.query.includes('*')) issueCount.selectAll++
    if (q.query.toLowerCase().includes('join')) issueCount.multipleJoins++
  })

  if (issueCount.noLimit > 10) {
    suggestions.push(`${issueCount.noLimit} queries without LIMIT clause - consider adding limits`)
  }
  if (issueCount.selectAll > 10) {
    suggestions.push(`${issueCount.selectAll} queries using SELECT * - select specific columns`)
  }
  if (issueCount.multipleJoins > 5) {
    suggestions.push(`${issueCount.multipleJoins} queries with multiple JOINs - consider denormalization`)
  }

  return suggestions
}

/**
 * Export slow query logs
 */
export function exportSlowQueryLogs(format: 'json' | 'csv' = 'json'): string {
  if (format === 'json') {
    return JSON.stringify(slowQueryLog, null, 2)
  }

  // CSV format
  const headers = ['timestamp', 'table', 'operation', 'duration', 'query', 'recommendation']
  const rows = slowQueryLog.map(q => [
    q.timestamp.toISOString(),
    q.table,
    q.operation,
    q.duration,
    q.query.replace(/"/g, '""'), // Escape quotes
    q.recommendation || '',
  ])

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n')
}

/**
 * Clear slow query logs
 */
export function clearSlowQueryLogs() {
  slowQueryLog.length = 0
  queryPatterns.clear()
}

/**
 * Enable/disable slow query logging
 */
export function setSlowQueryLogging(enabled: boolean) {
  SLOW_QUERY_CONFIG.enabled = enabled
}

export default {
  SlowQueryAnalyzer,
  getSlowQueries,
  getQueryPatternStats,
  getSlowQueryReport,
  generateOptimizationSuggestions,
  exportSlowQueryLogs,
  clearSlowQueryLogs,
  setSlowQueryLogging,
}
