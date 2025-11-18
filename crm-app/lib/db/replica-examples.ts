/**
 * Read Replica Usage Examples
 *
 * This file demonstrates how to use read replicas for different query patterns
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getReplicaClient, QueryRouter, ReportingQueries } from './read-replica'

// ============================================================================
// Example 1: Simple Read Query (Dashboard Stats)
// ============================================================================

export async function getDashboardStats(userId: string) {
  // Use replica for read-only dashboard queries
  const replica = await getReplicaClient()

  const { data: clientStats } = await replica
    .from('clients')
    .select('client_status, portfolio_value')
    .eq('user_id', userId)
    .eq('is_archived', false)

  const { data: taskStats } = await replica
    .from('tasks')
    .select('status, priority')
    .eq('user_id', userId)

  return {
    clients: clientStats,
    tasks: taskStats,
  }
}

// ============================================================================
// Example 2: Complex Reporting Query
// ============================================================================

export async function getPortfolioReport(userId: string, dateFrom: string, dateTo: string) {
  // Use ReportingQueries for complex analytical queries with retry logic
  return await ReportingQueries.execute(
    async (client) => {
      return await client
        .from('transactions')
        .select(`
          *,
          investment_accounts!inner(
            account_name,
            platform,
            clients!inner(
              first_name,
              last_name
            )
          )
        `)
        .eq('user_id', userId)
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo)
        .order('transaction_date', { ascending: false })
    },
    {
      maxRetries: 3,
      timeout: 60000, // 60 second timeout for large reports
    }
  )
}

// ============================================================================
// Example 3: Using QueryRouter for Mixed Operations
// ============================================================================

export class ClientService {
  private router: QueryRouter

  constructor() {
    const supabase = createRouteHandlerClient({ cookies })
    this.router = new QueryRouter(supabase)
  }

  // Read operation - uses replica
  async getClientDetails(clientId: string) {
    return await this.router.read('clients', async (client) => {
      return await client
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()
    })
  }

  // Write operation - uses primary
  async updateClient(clientId: string, updates: any) {
    return await this.router.write(async (client) => {
      return await client
        .from('clients')
        .update(updates)
        .eq('id', clientId)
        .select()
        .single()
    })
  }

  // Complex read - uses replica
  async getClientPortfolioSummary(clientId: string) {
    return await this.router.read('clients', async (client) => {
      const { data: accounts } = await client
        .from('investment_accounts')
        .select(`
          *,
          holdings(
            security_name,
            asset_class,
            market_value,
            unrealized_gain_loss
          )
        `)
        .eq('client_id', clientId)
        .eq('is_active', true)

      return { data: accounts, error: null }
    })
  }
}

// ============================================================================
// Example 4: API Route with Replica
// ============================================================================

// app/api/reports/webhook-stats/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return Response.json({ error: 'Missing userId' }, { status: 400 })
  }

  // Use replica for reporting endpoint
  const replica = await getReplicaClient()

  const { data: stats, error } = await replica
    .from('webhook_logs')
    .select('status, event_type, created_at')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Aggregate stats
  const aggregated = stats?.reduce((acc, log) => {
    acc[log.status] = (acc[log.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return Response.json({
    stats: aggregated,
    totalEvents: stats?.length || 0,
    period: '30 days',
  })
}

// ============================================================================
// Example 5: Batch Reporting with Replica
// ============================================================================

export async function generateMonthlyReport(userId: string, month: string) {
  const replica = await getReplicaClient()

  // Execute multiple reporting queries in parallel on replica
  const [
    clientMetrics,
    activityMetrics,
    portfolioMetrics,
    complianceMetrics,
  ] = await Promise.all([
    // Client metrics
    replica
      .from('clients')
      .select('client_status, risk_profile, portfolio_value')
      .eq('user_id', userId)
      .eq('is_archived', false),

    // Activity metrics
    replica
      .from('activities')
      .select('activity_type, activity_date')
      .eq('user_id', userId)
      .gte('activity_date', `${month}-01`)
      .lt('activity_date', getNextMonth(month)),

    // Portfolio metrics
    replica
      .from('transactions')
      .select('transaction_type, gross_amount, transaction_date')
      .eq('user_id', userId)
      .gte('transaction_date', `${month}-01`)
      .lt('transaction_date', getNextMonth(month)),

    // Compliance metrics
    replica
      .from('compliance_documents')
      .select('document_type, issued_date, expiry_date')
      .eq('user_id', userId)
      .lte('issued_date', `${month}-28`),
  ])

  return {
    month,
    clients: clientMetrics.data,
    activities: activityMetrics.data,
    transactions: portfolioMetrics.data,
    compliance: complianceMetrics.data,
  }
}

function getNextMonth(month: string): string {
  const date = new Date(month + '-01')
  date.setMonth(date.getMonth() + 1)
  return date.toISOString().slice(0, 7)
}

// ============================================================================
// Example 6: Server Component with Replica
// ============================================================================

// app/(dashboard)/reports/page.tsx
export async function ReportsPage() {
  const replica = await getReplicaClient()
  const supabase = createRouteHandlerClient({ cookies })

  // Get current user from primary (for auth)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>Unauthorized</div>
  }

  // Fetch report data from replica
  const { data: clients } = await replica
    .from('clients')
    .select('id, first_name, last_name, portfolio_value, client_status')
    .eq('user_id', user.id)
    .order('portfolio_value', { ascending: false })
    .limit(10)

  return (
    <div>
      <h1>Top Clients by Portfolio Value</h1>
      {/* Render clients */}
    </div>
  )
}

// ============================================================================
// Example 7: Webhook Logs Analytics
// ============================================================================

export async function getWebhookAnalytics(userId: string, days: number = 30) {
  const replica = await getReplicaClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Complex analytical query on replica
  const { data: logs } = await replica
    .from('webhook_logs')
    .select('event_type, status, attempts, created_at, response_status')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })

  if (!logs) return null

  // Calculate analytics
  const analytics = {
    totalEvents: logs.length,
    byStatus: {} as Record<string, number>,
    byEventType: {} as Record<string, number>,
    averageAttempts: 0,
    successRate: 0,
    errorRate: 0,
  }

  let totalAttempts = 0
  let successCount = 0

  logs.forEach(log => {
    analytics.byStatus[log.status] = (analytics.byStatus[log.status] || 0) + 1
    analytics.byEventType[log.event_type] = (analytics.byEventType[log.event_type] || 0) + 1
    totalAttempts += log.attempts
    if (log.status === 'delivered') successCount++
  })

  analytics.averageAttempts = totalAttempts / logs.length
  analytics.successRate = (successCount / logs.length) * 100
  analytics.errorRate = ((logs.length - successCount) / logs.length) * 100

  return analytics
}

export default {
  getDashboardStats,
  getPortfolioReport,
  ClientService,
  generateMonthlyReport,
  getWebhookAnalytics,
}
