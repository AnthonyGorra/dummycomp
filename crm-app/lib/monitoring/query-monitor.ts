/**
 * Query Performance Monitoring
 *
 * Tracks database query performance, identifies slow queries,
 * and provides insights for optimization.
 */

import { SupabaseClient } from '@supabase/supabase-js'

// Configuration
const MONITORING_CONFIG = {
  enabled: process.env.ENABLE_QUERY_LOGGING === 'true',
  slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '1000'),
  enableSlowQueryLogging: process.env.ENABLE_SLOW_QUERY_LOGGING !== 'false',
  sampleRate: parseFloat(process.env.QUERY_LOGGING_SAMPLE_RATE || '0.1'), // 10% sampling
}

// Query performance metrics
interface QueryMetrics {
  query: string
  table: string
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC'
  duration: number
  timestamp: Date
  success: boolean
  error?: string
  rowCount?: number
  userId?: string
  stackTrace?: string
}

// In-memory query log (for development)
// In production, send to monitoring service (Datadog, New Relic, etc.)
const queryLog: QueryMetrics[] = []
const MAX_LOG_SIZE = 1000

// Query statistics aggregator
const queryStats = new Map<string, {
  count: number
  totalDuration: number
  avgDuration: number
  minDuration: number
  maxDuration: number
  errorCount: number
  lastExecuted: Date
}>()

/**
 * Query monitoring wrapper for Supabase client
 */
export class QueryMonitor {
  private client: SupabaseClient
  private userId?: string

  constructor(client: SupabaseClient, userId?: string) {
    this.client = client
    this.userId = userId
  }

  /**
   * Monitor a query execution
   */
  async monitor<T = any>(
    operation: QueryMetrics['operation'],
    table: string,
    queryFn: () => Promise<{ data: T | null; error: any; count?: number }>,
    queryString?: string
  ): Promise<{ data: T | null; error: any; count?: number }> {
    if (!MONITORING_CONFIG.enabled && !MONITORING_CONFIG.enableSlowQueryLogging) {
      return await queryFn()
    }

    // Sample queries based on sample rate
    const shouldLog = Math.random() < MONITORING_CONFIG.sampleRate

    const startTime = Date.now()
    const stackTrace = shouldLog ? new Error().stack : undefined

    let result: { data: T | null; error: any; count?: number }

    try {
      result = await queryFn()
      const duration = Date.now() - startTime

      // Log slow queries or sampled queries
      if (duration >= MONITORING_CONFIG.slowQueryThreshold || shouldLog) {
        this.logQuery({
          query: queryString || `${operation} ${table}`,
          table,
          operation,
          duration,
          timestamp: new Date(),
          success: !result.error,
          error: result.error?.message,
          rowCount: result.count,
          userId: this.userId,
          stackTrace: duration >= MONITORING_CONFIG.slowQueryThreshold ? stackTrace : undefined,
        })
      }

      // Update statistics
      this.updateStats(table, operation, duration, !result.error)

      return result
    } catch (error) {
      const duration = Date.now() - startTime

      this.logQuery({
        query: queryString || `${operation} ${table}`,
        table,
        operation,
        duration,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        userId: this.userId,
        stackTrace,
      })

      this.updateStats(table, operation, duration, false)

      throw error
    }
  }

  /**
   * Monitor SELECT query
   */
  async select<T = any>(
    table: string,
    queryFn: () => Promise<{ data: T | null; error: any; count?: number }>,
    queryString?: string
  ) {
    return this.monitor('SELECT', table, queryFn, queryString)
  }

  /**
   * Monitor INSERT query
   */
  async insert<T = any>(
    table: string,
    queryFn: () => Promise<{ data: T | null; error: any }>,
    queryString?: string
  ) {
    return this.monitor('INSERT', table, queryFn, queryString)
  }

  /**
   * Monitor UPDATE query
   */
  async update<T = any>(
    table: string,
    queryFn: () => Promise<{ data: T | null; error: any }>,
    queryString?: string
  ) {
    return this.monitor('UPDATE', table, queryFn, queryString)
  }

  /**
   * Monitor DELETE query
   */
  async delete<T = any>(
    table: string,
    queryFn: () => Promise<{ data: T | null; error: any }>,
    queryString?: string
  ) {
    return this.monitor('DELETE', table, queryFn, queryString)
  }

  /**
   * Log query metrics
   */
  private logQuery(metrics: QueryMetrics) {
    // Add to in-memory log
    queryLog.push(metrics)

    // Maintain max log size
    if (queryLog.length > MAX_LOG_SIZE) {
      queryLog.shift()
    }

    // Log slow queries to console
    if (metrics.duration >= MONITORING_CONFIG.slowQueryThreshold) {
      console.warn('Slow query detected:', {
        query: metrics.query,
        table: metrics.table,
        duration: `${metrics.duration}ms`,
        userId: metrics.userId,
        error: metrics.error,
      })

      if (metrics.stackTrace) {
        console.warn('Stack trace:', metrics.stackTrace)
      }
    }

    // Send to monitoring service (implement based on your service)
    this.sendToMonitoringService(metrics)
  }

  /**
   * Update query statistics
   */
  private updateStats(
    table: string,
    operation: string,
    duration: number,
    success: boolean
  ) {
    const key = `${table}.${operation}`
    const existing = queryStats.get(key) || {
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      errorCount: 0,
      lastExecuted: new Date(),
    }

    existing.count++
    existing.totalDuration += duration
    existing.avgDuration = existing.totalDuration / existing.count
    existing.minDuration = Math.min(existing.minDuration, duration)
    existing.maxDuration = Math.max(existing.maxDuration, duration)
    if (!success) existing.errorCount++
    existing.lastExecuted = new Date()

    queryStats.set(key, existing)
  }

  /**
   * Send metrics to monitoring service
   */
  private sendToMonitoringService(metrics: QueryMetrics) {
    // Implement integration with your monitoring service
    // Examples: Datadog, New Relic, CloudWatch, Sentry

    // Example: Datadog
    // if (typeof window === 'undefined' && process.env.DATADOG_API_KEY) {
    //   // Send to Datadog
    // }

    // Example: Custom endpoint
    // if (process.env.METRICS_ENDPOINT) {
    //   fetch(process.env.METRICS_ENDPOINT, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(metrics),
    //   }).catch(console.error)
    // }
  }
}

/**
 * Get query performance statistics
 */
export function getQueryStats() {
  return {
    queries: Array.from(queryStats.entries()).map(([key, stats]) => ({
      query: key,
      ...stats,
      minDuration: stats.minDuration === Infinity ? 0 : stats.minDuration,
    })),
    slowQueries: queryLog.filter(q => q.duration >= MONITORING_CONFIG.slowQueryThreshold),
    recentErrors: queryLog.filter(q => !q.success).slice(-50),
    totalQueries: queryLog.length,
  }
}

/**
 * Get slow query report
 */
export function getSlowQueryReport(limit: number = 20) {
  const slowQueries = queryLog
    .filter(q => q.duration >= MONITORING_CONFIG.slowQueryThreshold)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, limit)

  return {
    queries: slowQueries,
    summary: {
      total: slowQueries.length,
      avgDuration: slowQueries.reduce((sum, q) => sum + q.duration, 0) / slowQueries.length || 0,
      maxDuration: Math.max(...slowQueries.map(q => q.duration), 0),
      byTable: slowQueries.reduce((acc, q) => {
        acc[q.table] = (acc[q.table] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byOperation: slowQueries.reduce((acc, q) => {
        acc[q.operation] = (acc[q.operation] || 0) + 1
        return acc
      }, {} as Record<string, number>),
    },
  }
}

/**
 * Clear query logs (for testing)
 */
export function clearQueryLogs() {
  queryLog.length = 0
  queryStats.clear()
}

/**
 * Export query logs to file
 */
export function exportQueryLogs(format: 'json' | 'csv' = 'json') {
  if (format === 'json') {
    return JSON.stringify(queryLog, null, 2)
  }

  // CSV format
  const headers = ['timestamp', 'table', 'operation', 'duration', 'success', 'error', 'userId']
  const rows = queryLog.map(q => [
    q.timestamp.toISOString(),
    q.table,
    q.operation,
    q.duration,
    q.success,
    q.error || '',
    q.userId || '',
  ])

  return [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n')
}

/**
 * Supabase client wrapper with monitoring
 */
export function createMonitoredClient(client: SupabaseClient, userId?: string) {
  const monitor = new QueryMonitor(client, userId)

  return {
    ...client,
    monitor,

    // Wrap common methods with monitoring
    async from(table: string) {
      const builder = client.from(table)

      // Wrap select
      const originalSelect = builder.select.bind(builder)
      builder.select = (...args: any[]) => {
        const query = originalSelect(...args)
        const originalExecute = query.then?.bind(query)

        if (originalExecute) {
          query.then = (onFulfilled: any, onRejected: any) => {
            return monitor
              .select(table, () => originalExecute(x => x, e => ({ data: null, error: e })))
              .then(onFulfilled, onRejected)
          }
        }

        return query
      }

      return builder
    },
  }
}

export default {
  QueryMonitor,
  getQueryStats,
  getSlowQueryReport,
  clearQueryLogs,
  exportQueryLogs,
  createMonitoredClient,
}
