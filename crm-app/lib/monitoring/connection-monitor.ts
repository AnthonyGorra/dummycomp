/**
 * Database Connection Monitoring and Alerting
 *
 * Monitors database connection health, pool usage, and sends alerts
 * when thresholds are exceeded.
 */

import { SupabaseClient } from '@supabase/supabase-js'

// Configuration
const MONITORING_CONFIG = {
  enabled: process.env.ENABLE_CONNECTION_MONITORING === 'true',
  interval: parseInt(process.env.DB_MONITORING_INTERVAL_MS || '60000'),
  alertThreshold: parseInt(process.env.CONNECTION_POOL_ALERT_THRESHOLD || '80'),
  enableAlerts: process.env.ENABLE_DB_ALERTS !== 'false',
}

// Connection metrics
interface ConnectionMetrics {
  timestamp: Date
  totalConnections: number
  activeConnections: number
  idleConnections: number
  waitingClients: number
  poolUtilization: number
  errorCount: number
  slowQueryCount: number
  avgResponseTime: number
}

// Alert types
type AlertType = 'HIGH_CONNECTION_USAGE' | 'CONNECTION_ERROR' | 'SLOW_QUERIES' | 'POOL_EXHAUSTED'

interface Alert {
  type: AlertType
  severity: 'warning' | 'critical'
  message: string
  timestamp: Date
  metrics?: Partial<ConnectionMetrics>
}

// Metrics storage
const metricsHistory: ConnectionMetrics[] = []
const MAX_HISTORY_SIZE = 1440 // 24 hours at 1-minute intervals
const alerts: Alert[] = []
const MAX_ALERTS = 100

let monitoringInterval: NodeJS.Timeout | null = null
let lastHealthCheck: Date | null = null
let healthCheckErrors = 0

/**
 * Connection Monitor Class
 */
export class ConnectionMonitor {
  private client: SupabaseClient
  private isMonitoring = false

  constructor(client: SupabaseClient) {
    this.client = client
  }

  /**
   * Start monitoring
   */
  start() {
    if (!MONITORING_CONFIG.enabled || this.isMonitoring) {
      return
    }

    this.isMonitoring = true
    console.log('Starting database connection monitoring...')

    // Initial health check
    this.checkHealth()

    // Schedule periodic monitoring
    monitoringInterval = setInterval(() => {
      this.checkHealth()
    }, MONITORING_CONFIG.interval)
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (monitoringInterval) {
      clearInterval(monitoringInterval)
      monitoringInterval = null
    }
    this.isMonitoring = false
    console.log('Stopped database connection monitoring')
  }

  /**
   * Check database health
   */
  async checkHealth(): Promise<ConnectionMetrics | null> {
    try {
      const startTime = Date.now()

      // Simple health check query
      const { error: healthError } = await this.client
        .from('clients')
        .select('id')
        .limit(1)
        .single()

      const responseTime = Date.now() - startTime

      if (healthError && healthError.code !== 'PGRST116') {
        // PGRST116 = no rows, which is acceptable
        healthCheckErrors++
        this.createAlert('CONNECTION_ERROR', 'warning', `Database health check failed: ${healthError.message}`)
        return null
      }

      healthCheckErrors = 0
      lastHealthCheck = new Date()

      // Get connection metrics (if using PgBouncer)
      const metrics = await this.getConnectionMetrics()

      if (metrics) {
        metrics.avgResponseTime = responseTime
        this.recordMetrics(metrics)
        this.checkThresholds(metrics)
      }

      return metrics
    } catch (error) {
      healthCheckErrors++
      console.error('Database health check error:', error)
      this.createAlert(
        'CONNECTION_ERROR',
        healthCheckErrors > 3 ? 'critical' : 'warning',
        `Database connection error: ${error instanceof Error ? error.message : String(error)}`
      )
      return null
    }
  }

  /**
   * Get connection metrics from PgBouncer
   */
  async getConnectionMetrics(): Promise<ConnectionMetrics | null> {
    // If using PgBouncer, connect to admin interface to get pool stats
    // This requires PgBouncer admin access
    const pgbouncerUrl = process.env.PGBOUNCER_ADMIN_URL

    if (!pgbouncerUrl) {
      // Return estimated metrics without PgBouncer
      return {
        timestamp: new Date(),
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        waitingClients: 0,
        poolUtilization: 0,
        errorCount: healthCheckErrors,
        slowQueryCount: 0,
        avgResponseTime: 0,
      }
    }

    try {
      // Connect to PgBouncer admin database
      // This would require a separate PostgreSQL client
      // For now, return placeholder metrics

      // Example query: SHOW POOLS;
      // This would give us: database, user, cl_active, cl_waiting, sv_active, sv_idle, etc.

      return {
        timestamp: new Date(),
        totalConnections: 0, // From SHOW POOLS
        activeConnections: 0, // sv_active
        idleConnections: 0, // sv_idle
        waitingClients: 0, // cl_waiting
        poolUtilization: 0, // calculated
        errorCount: healthCheckErrors,
        slowQueryCount: 0,
        avgResponseTime: 0,
      }
    } catch (error) {
      console.error('Failed to get PgBouncer metrics:', error)
      return null
    }
  }

  /**
   * Record metrics to history
   */
  private recordMetrics(metrics: ConnectionMetrics) {
    metricsHistory.push(metrics)

    // Maintain max history size
    if (metricsHistory.length > MAX_HISTORY_SIZE) {
      metricsHistory.shift()
    }
  }

  /**
   * Check if metrics exceed thresholds
   */
  private checkThresholds(metrics: ConnectionMetrics) {
    // Check pool utilization
    if (metrics.poolUtilization >= MONITORING_CONFIG.alertThreshold) {
      this.createAlert(
        'HIGH_CONNECTION_USAGE',
        metrics.poolUtilization >= 95 ? 'critical' : 'warning',
        `Connection pool utilization is ${metrics.poolUtilization}%`,
        { poolUtilization: metrics.poolUtilization }
      )
    }

    // Check waiting clients
    if (metrics.waitingClients > 0) {
      this.createAlert(
        'POOL_EXHAUSTED',
        metrics.waitingClients > 10 ? 'critical' : 'warning',
        `${metrics.waitingClients} clients waiting for connections`,
        { waitingClients: metrics.waitingClients }
      )
    }

    // Check error rate
    if (metrics.errorCount > 5) {
      this.createAlert(
        'CONNECTION_ERROR',
        'critical',
        `High error rate: ${metrics.errorCount} errors detected`,
        { errorCount: metrics.errorCount }
      )
    }

    // Check slow queries
    if (metrics.slowQueryCount > 10) {
      this.createAlert(
        'SLOW_QUERIES',
        'warning',
        `High number of slow queries: ${metrics.slowQueryCount}`,
        { slowQueryCount: metrics.slowQueryCount }
      )
    }
  }

  /**
   * Create an alert
   */
  private createAlert(
    type: AlertType,
    severity: 'warning' | 'critical',
    message: string,
    metrics?: Partial<ConnectionMetrics>
  ) {
    if (!MONITORING_CONFIG.enableAlerts) {
      return
    }

    const alert: Alert = {
      type,
      severity,
      message,
      timestamp: new Date(),
      metrics,
    }

    alerts.push(alert)

    // Maintain max alerts
    if (alerts.length > MAX_ALERTS) {
      alerts.shift()
    }

    // Log alert
    console[severity === 'critical' ? 'error' : 'warn']('Database Alert:', alert)

    // Send notification (implement based on your notification service)
    this.sendAlert(alert)
  }

  /**
   * Send alert notification
   */
  private async sendAlert(alert: Alert) {
    // Implement notification based on your service
    // Examples: Email, Slack, PagerDuty, etc.

    // Example: Slack webhook
    const slackWebhook = process.env.SLACK_ALERT_WEBHOOK
    if (slackWebhook) {
      try {
        await fetch(slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 Database Alert: ${alert.message}`,
            attachments: [{
              color: alert.severity === 'critical' ? 'danger' : 'warning',
              fields: [
                { title: 'Type', value: alert.type, short: true },
                { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
                { title: 'Timestamp', value: alert.timestamp.toISOString(), short: false },
                ...(alert.metrics ? Object.entries(alert.metrics).map(([key, value]) => ({
                  title: key,
                  value: String(value),
                  short: true,
                })) : []),
              ],
            }],
          }),
        })
      } catch (error) {
        console.error('Failed to send Slack alert:', error)
      }
    }

    // Example: Custom webhook
    const alertWebhook = process.env.ALERT_WEBHOOK_URL
    if (alertWebhook) {
      try {
        await fetch(alertWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert),
        })
      } catch (error) {
        console.error('Failed to send alert webhook:', error)
      }
    }

    // Example: Email (using a service like SendGrid, SES, etc.)
    // if (process.env.ALERT_EMAIL) {
    //   await sendEmail({
    //     to: process.env.ALERT_EMAIL,
    //     subject: `Database Alert: ${alert.type}`,
    //     body: alert.message,
    //   })
    // }
  }
}

/**
 * Get connection metrics history
 */
export function getMetricsHistory(minutes: number = 60) {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000)
  return metricsHistory.filter(m => m.timestamp >= cutoff)
}

/**
 * Get recent alerts
 */
export function getRecentAlerts(limit: number = 20) {
  return alerts.slice(-limit).reverse()
}

/**
 * Get connection health summary
 */
export function getHealthSummary() {
  const recentMetrics = getMetricsHistory(5) // Last 5 minutes

  if (recentMetrics.length === 0) {
    return {
      status: 'unknown',
      lastCheck: lastHealthCheck,
      errorCount: healthCheckErrors,
    }
  }

  const avgUtilization = recentMetrics.reduce((sum, m) => sum + m.poolUtilization, 0) / recentMetrics.length
  const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / recentMetrics.length
  const totalErrors = recentMetrics.reduce((sum, m) => sum + m.errorCount, 0)

  let status: 'healthy' | 'degraded' | 'unhealthy'
  if (totalErrors > 5 || avgUtilization > 95) {
    status = 'unhealthy'
  } else if (totalErrors > 0 || avgUtilization > 80) {
    status = 'degraded'
  } else {
    status = 'healthy'
  }

  return {
    status,
    lastCheck: lastHealthCheck,
    metrics: {
      avgUtilization,
      avgResponseTime,
      errorCount: totalErrors,
    },
    recentAlerts: getRecentAlerts(5),
  }
}

/**
 * Clear metrics history (for testing)
 */
export function clearMetrics() {
  metricsHistory.length = 0
  alerts.length = 0
  healthCheckErrors = 0
  lastHealthCheck = null
}

/**
 * Export metrics to file
 */
export function exportMetrics(format: 'json' | 'csv' = 'json') {
  if (format === 'json') {
    return JSON.stringify({
      metrics: metricsHistory,
      alerts: alerts,
    }, null, 2)
  }

  // CSV format
  const headers = ['timestamp', 'totalConnections', 'activeConnections', 'idleConnections',
                   'waitingClients', 'poolUtilization', 'errorCount', 'avgResponseTime']
  const rows = metricsHistory.map(m => [
    m.timestamp.toISOString(),
    m.totalConnections,
    m.activeConnections,
    m.idleConnections,
    m.waitingClients,
    m.poolUtilization,
    m.errorCount,
    m.avgResponseTime,
  ])

  return [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n')
}

/**
 * Initialize connection monitoring
 */
let globalMonitor: ConnectionMonitor | null = null

export function initializeMonitoring(client: SupabaseClient) {
  if (globalMonitor) {
    return globalMonitor
  }

  globalMonitor = new ConnectionMonitor(client)

  if (MONITORING_CONFIG.enabled) {
    globalMonitor.start()
  }

  return globalMonitor
}

/**
 * Get global monitor instance
 */
export function getMonitor(): ConnectionMonitor | null {
  return globalMonitor
}

export default {
  ConnectionMonitor,
  getMetricsHistory,
  getRecentAlerts,
  getHealthSummary,
  clearMetrics,
  exportMetrics,
  initializeMonitoring,
  getMonitor,
}
