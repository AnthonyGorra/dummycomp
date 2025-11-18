'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  DollarSign, 
  TrendingUp, 
  Target,
  AlertCircle,
  Calendar,
  PieChart
} from 'lucide-react'
import Link from 'next/link'
import { mockClients } from '@/lib/data/mock-clients'

interface ExtendedClient {
  id: string
  client_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  date_of_birth?: string
  portfolio_value?: number
  risk_profile?: 'Conservative' | 'Balanced' | 'Growth'
  client_since?: string
  investment_goal?: string
  assigned_adviser?: string
  review_frequency?: 'Quarterly' | 'Semi-annually' | 'Annually'
  next_review_date?: string
  notes?: string
  entity_type: 'Individual' | 'Family'
  family_name?: string
}

export default function ClientFinancialPage() {
  const params = useParams()
  const [client, setClient] = useState<ExtendedClient | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadClient = () => {
      const foundClient = mockClients.find((c, index) => (index + 1).toString() === params.id)
      
      if (foundClient) {
        const extendedClient: ExtendedClient = {
          ...foundClient,
          id: params.id as string,
          client_id: `CL-${String(parseInt(params.id as string)).padStart(4, '0')}`,
          entity_type: foundClient.last_name.includes('Family') ? 'Family' : 'Individual',
          family_name: foundClient.last_name.includes('Family') ? foundClient.last_name : undefined
        }
        setClient(extendedClient)
      }
      setLoading(false)
    }

    loadClient()
  }, [params.id])

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not disclosed'
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getDisplayName = (client: ExtendedClient) => {
    if (client.entity_type === 'Family') {
      return client.family_name || `${client.last_name} Family`
    }
    return `${client.first_name} ${client.last_name}`
  }

  const getRiskProfileColor = (profile?: string) => {
    switch (profile) {
      case 'Conservative': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
      case 'Balanced': return 'bg-yellow-100 text-yellow-800'
      case 'Growth': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  if (!client) {
    return <div className="flex items-center justify-center h-64">Client not found</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/clients/${client.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold text-black">Financial Details</h1>
            <p className="text-muted-foreground mt-1">{getDisplayName(client)} • {client.client_id}</p>
          </div>
        </div>
      </div>

      {/* Warning Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800">Confidential Financial Information</h3>
              <p className="text-sm text-amber-700 mt-1">
                This page contains sensitive financial information. Ensure you have appropriate authorization to view this data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Portfolio Value */}
        <Card className="border-cream-dark">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-coral" />
              Portfolio Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black mb-2">
              {formatCurrency(client.portfolio_value)}
            </div>
            <p className="text-sm text-gray-600">Current total portfolio value</p>
          </CardContent>
        </Card>

        {/* Risk Profile */}
        <Card className="border-cream-dark">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-coral" />
              Risk Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3">
              {client.risk_profile ? (
                <Badge className={`text-lg px-3 py-1 ${getRiskProfileColor(client.risk_profile)}`}>
                  {client.risk_profile}
                </Badge>
              ) : (
                <span className="text-gray-500">Not assessed</span>
              )}
            </div>
            <p className="text-sm text-gray-600">Investment risk tolerance</p>
          </CardContent>
        </Card>

        {/* Investment Goal */}
        <Card className="border-cream-dark">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-coral" />
              Investment Goal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium text-black mb-2">
              {client.investment_goal || 'Not specified'}
            </div>
            <p className="text-sm text-gray-600">Primary investment objective</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Financial Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Financial Timeline */}
        <Card className="border-cream-dark">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-coral" />
              Financial Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Client Since</p>
              <p className="font-medium">{formatDate(client.client_since)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Review Frequency</p>
              <p className="font-medium">{client.review_frequency || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Next Review Date</p>
              <p className="font-medium">{formatDate(client.next_review_date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Assigned Adviser</p>
              <p className="font-medium">{client.assigned_adviser || 'Not assigned'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Analysis */}
        <Card className="border-cream-dark">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5 text-coral" />
              Portfolio Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Portfolio Size Category</p>
                <Badge variant="outline" className="text-sm">
                  {client.portfolio_value && client.portfolio_value > 1000000 ? 'High Net Worth' :
                   client.portfolio_value && client.portfolio_value > 500000 ? 'Affluent' :
                   client.portfolio_value && client.portfolio_value > 100000 ? 'Moderate' : 'Building'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Risk Alignment</p>
                <div className="text-sm">
                  {client.risk_profile === 'Conservative' && 
                    <span className="text-blue-700 dark:text-blue-400">Focused on capital preservation</span>
                  }
                  {client.risk_profile === 'Balanced' && 
                    <span className="text-yellow-700">Balanced growth and security approach</span>
                  }
                  {client.risk_profile === 'Growth' && 
                    <span className="text-green-700">Growth-oriented investment strategy</span>
                  }
                  {!client.risk_profile && 
                    <span className="text-gray-500">Risk profile assessment pending</span>
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Notes */}
      {client.notes && (
        <Card className="border-cream-dark">
          <CardHeader>
            <CardTitle className="text-lg">Financial Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{client.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="border-cream-dark">
        <CardHeader>
          <CardTitle className="text-lg">Related Financial Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href={`/clients/${client.id}/portfolio`}>
              <Button variant="outline" className="w-full justify-start">
                <PieChart className="h-4 w-4 mr-2" />
                View Portfolio Details
              </Button>
            </Link>
            <Link href={`/clients/${client.id}/risk-profile`}>
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="h-4 w-4 mr-2" />
                Risk Assessment
              </Button>
            </Link>
            <Button variant="outline" className="w-full justify-start" disabled>
              <DollarSign className="h-4 w-4 mr-2" />
              Investment Recommendations
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}