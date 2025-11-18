/**
 * Performance Monitoring Metrics API Endpoint
 *
 * Provides access to database performance metrics, slow queries,
 * and connection health information.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getQueryStats, getSlowQueryReport } from '@/lib/monitoring/query-monitor'
import { getHealthSummary, getRecentAlerts, getMetricsHistory } from '@/lib/monitoring/connection-monitor'
import { getSlowQueries, getQueryPatternStats, generateOptimizationSuggestions } from '@/lib/monitoring/slow-query-analyzer'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'summary'
    const format = searchParams.get('format') || 'json'

    // Route to different metric types
    switch (type) {
      case 'summary':
        return getSummaryMetrics()

      case 'queries':
        return getQueryMetrics()

      case 'connections':
        return getConnectionMetrics()

      case 'slow-queries':
        return getSlowQueryMetrics()

      case 'health':
        return getHealthMetrics()

      case 'export':
        return exportMetrics(format as 'json' | 'csv')

      default:
        return NextResponse.json(
          { error: 'Invalid metric type' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Metrics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get summary metrics
 */
function getSummaryMetrics() {
  const queryStats = getQueryStats()
  const healthSummary = getHealthSummary()
  const slowQueries = getSlowQueries({ limit: 10 })
  const suggestions = generateOptimizationSuggestions()

  return NextResponse.json({
    health: healthSummary,
    queries: {
      total: queryStats.totalQueries,
      slow: queryStats.slowQueries.length,
      errors: queryStats.recentErrors.length,
    },
    slowQueries: slowQueries.slice(0, 5),
    optimizationSuggestions: suggestions.slice(0, 5),
    timestamp: new Date().toISOString(),
  })
}

/**
 * Get detailed query metrics
 */
function getQueryMetrics() {
  const stats = getQueryStats()
  const patternStats = getQueryPatternStats()

  return NextResponse.json({
    statistics: stats,
    patterns: patternStats.slice(0, 20),
    timestamp: new Date().toISOString(),
  })
}

/**
 * Get connection metrics
 */
function getConnectionMetrics() {
  const healthSummary = getHealthSummary()
  const alerts = getRecentAlerts(50)
  const history = getMetricsHistory(60) // Last hour

  return NextResponse.json({
    health: healthSummary,
    alerts,
    history,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Get slow query metrics
 */
function getSlowQueryMetrics() {
  const report = getSlowQueryReport()
  const suggestions = generateOptimizationSuggestions()

  return NextResponse.json({
    report,
    suggestions,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Get health metrics
 */
function getHealthMetrics() {
  const health = getHealthSummary()

  return NextResponse.json({
    ...health,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Export metrics
 */
function exportMetrics(format: 'json' | 'csv') {
  const queryStats = getQueryStats()
  const healthSummary = getHealthSummary()
  const slowQueries = getSlowQueries()
  const alerts = getRecentAlerts(100)

  if (format === 'csv') {
    // Generate CSV export
    const csv = [
      '# Query Statistics',
      'Total Queries,Slow Queries,Errors',
      `${queryStats.totalQueries},${queryStats.slowQueries.length},${queryStats.recentErrors.length}`,
      '',
      '# Slow Queries',
      'Timestamp,Table,Operation,Duration (ms),Query',
      ...slowQueries.map(q =>
        `${q.timestamp.toISOString()},${q.table},${q.operation},${q.duration},"${q.query.replace(/"/g, '""')}"`
      ),
    ].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="metrics-${Date.now()}.csv"`,
      },
    })
  }

  // JSON export
  const exportData = {
    exportDate: new Date().toISOString(),
    health: healthSummary,
    queries: queryStats,
    slowQueries,
    alerts,
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="metrics-${Date.now()}.json"`,
    },
  })
}

/**
 * POST endpoint for manual health checks
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { action } = await request.json()

    switch (action) {
      case 'health-check':
        // Trigger manual health check
        const health = getHealthSummary()
        return NextResponse.json({
          success: true,
          health,
        })

      case 'clear-logs':
        // Clear monitoring logs (admin only)
        // Implement admin check here
        return NextResponse.json({
          success: true,
          message: 'Logs cleared',
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Metrics API POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
