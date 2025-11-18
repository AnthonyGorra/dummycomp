'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserPlus, Calendar, TrendingUp, Activity, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { mockClients } from '@/lib/data/mock-clients'

interface ClientMetrics {
  totalClients: number
  newClientsThisWeek: number
  newClientsThisMonth: number
  newClientsThisYear: number
  recentClientActivity: ClientActivity[]
  upcomingReviews: number
}

interface ClientActivity {
  id: string
  title: string
  type: string
  created_at: string
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<ClientMetrics>({
    totalClients: 0,
    newClientsThisWeek: 0,
    newClientsThisMonth: 0,
    newClientsThisYear: 0,
    recentClientActivity: [],
    upcomingReviews: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchClientMetrics()
  }, [])

  const fetchClientMetrics = async () => {
    try {
      // Calculate metrics from mock clients
      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      // Simulate some clients being added recently by using random dates
      const clientsWithRecentDates = mockClients.map((client, index) => ({
        ...client,
        // Simulate some recent additions - last 20% of clients are "recent"
        client_since: index >= mockClients.length * 0.8 
          ? new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          : client.client_since,
        // Simulate some upcoming reviews
        next_review_date: client.next_review_date || 
          new Date(now.getTime() + Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }))

      const totalClients = clientsWithRecentDates.length

      const newClientsThisWeek = clientsWithRecentDates.filter(client => 
        client.client_since && new Date(client.client_since) >= oneWeekAgo
      ).length

      const newClientsThisMonth = clientsWithRecentDates.filter(client => 
        client.client_since && new Date(client.client_since) >= oneMonthAgo
      ).length

      const newClientsThisYear = clientsWithRecentDates.filter(client => 
        client.client_since && new Date(client.client_since) >= oneYearAgo
      ).length

      const upcomingReviews = clientsWithRecentDates.filter(client => 
        client.next_review_date && 
        new Date(client.next_review_date) <= thirtyDaysFromNow &&
        new Date(client.next_review_date) >= now
      ).length

      setMetrics({
        totalClients,
        newClientsThisWeek,
        newClientsThisMonth,
        newClientsThisYear,
        upcomingReviews,
        recentClientActivity: [
          { id: '1', title: `Added new client: ${clientsWithRecentDates[clientsWithRecentDates.length - 1]?.first_name} ${clientsWithRecentDates[clientsWithRecentDates.length - 1]?.last_name}`, type: 'client_added', created_at: new Date().toISOString() },
          { id: '2', title: `Client review completed: ${clientsWithRecentDates[5]?.first_name} ${clientsWithRecentDates[5]?.last_name}`, type: 'review', created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString() },
          { id: '3', title: `Portfolio updated: ${clientsWithRecentDates[12]?.first_name} ${clientsWithRecentDates[12]?.last_name}`, type: 'portfolio_update', created_at: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString() },
          { id: '4', title: `Client contact updated: ${clientsWithRecentDates[8]?.first_name} ${clientsWithRecentDates[8]?.last_name}`, type: 'contact_update', created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() },
        ]
      })
    } catch (error) {
      console.error('Error fetching client metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const metricCards = [
    {
      title: 'Total Clients',
      value: metrics.totalClients,
      icon: Users,
      description: `${metrics.newClientsThisYear} added this year`,
      color: 'text-blue-700 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30'
    },
    {
      title: 'New This Week',
      value: metrics.newClientsThisWeek,
      icon: UserPlus,
      description: 'Recently onboarded',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'New This Month',
      value: metrics.newClientsThisMonth,
      icon: Calendar,
      description: 'Monthly growth',
      color: 'text-coral',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Upcoming Reviews',
      value: metrics.upcomingReviews,
      icon: Clock,
      description: 'Next 30 days',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-black">Client Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back! Here&apos;s your client portfolio overview.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.title} className="border-cream-dark hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <div className={`${metric.bgColor} p-2 rounded-lg`}>
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Activity and Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-cream-dark">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-coral" />
              Recent Client Activity
            </CardTitle>
            <CardDescription>Latest client updates and interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.recentClientActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-cream transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-cream-dark">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-coral" />
              Client Growth Trends
            </CardTitle>
            <CardDescription>Client acquisition and engagement metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Monthly Growth Rate</span>
                  <span className="text-sm text-muted-foreground">+{Math.round((metrics.newClientsThisMonth / metrics.totalClients) * 100)}%</span>
                </div>
                <div className="w-full bg-cream-dark rounded-full h-2">
                  <div className="bg-coral h-2 rounded-full" style={{ width: `${Math.min((metrics.newClientsThisMonth / metrics.totalClients) * 100 * 10, 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Review Completion</span>
                  <span className="text-sm text-muted-foreground">85%</span>
                </div>
                <div className="w-full bg-cream-dark rounded-full h-2">
                  <div className="bg-coral-light h-2 rounded-full" style={{ width: '85%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Client Retention</span>
                  <span className="text-sm text-muted-foreground">96%</span>
                </div>
                <div className="w-full bg-cream-dark rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '96%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Active Engagements</span>
                  <span className="text-sm text-muted-foreground">78%</span>
                </div>
                <div className="w-full bg-cream-dark rounded-full h-2">
                  <div className="bg-blue-600 dark:bg-blue-700 h-2 rounded-full" style={{ width: '78%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}