'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Users,
  FileText, 
  PieChart, 
  TrendingUp,
  Shield,
  DollarSign,
  Phone,
  Mail
} from 'lucide-react'
import Link from 'next/link'
import { mockClients } from '@/lib/data/mock-clients'

interface ExtendedClient {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  client_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  date_of_birth?: string
  street_address?: string
  city?: string
  state?: string
  postcode?: string
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

export default function ClientDetailPage() {
  const params = useParams()
  const [client, setClient] = useState<ExtendedClient | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadClient = () => {
      // Find client from mock data (in real app, this would be from Supabase)
      const foundClient = mockClients.find((c, index) => (index + 1).toString() === params.id)
      
      if (foundClient) {
        // Convert to extended client with additional fields
        const extendedClient: ExtendedClient = {
          ...foundClient,
          id: params.id as string,
          client_id: `CL-${String(parseInt(params.id as string)).padStart(4, '0')}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: 'demo-user',
          entity_type: foundClient.last_name.includes('Family') ? 'Family' : 'Individual',
          family_name: foundClient.last_name.includes('Family') ? foundClient.last_name : undefined
        }
        setClient(extendedClient)
      }
      setLoading(false)
    }

    loadClient()
  }, [params.id])

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getInitials = (firstName: string, lastName: string, entityType: string) => {
    if (entityType === 'Family') {
      return lastName.charAt(0).toUpperCase()
    }
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }

  const getDisplayName = (client: ExtendedClient) => {
    if (client.entity_type === 'Family') {
      return client.family_name || `${client.last_name} Family`
    }
    return `${client.first_name} ${client.last_name}`
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
          <Link href="/clients">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 bg-coral-light">
              <AvatarFallback className="bg-coral text-white text-xl">
                {getInitials(client.first_name, client.last_name, client.entity_type)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-semibold text-black">
                {getDisplayName(client)}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <Badge className={`${client.entity_type === 'Family' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                  {client.entity_type === 'Family' ? (
                    <Users className="h-3 w-3 mr-1" />
                  ) : (
                    <User className="h-3 w-3 mr-1" />
                  )}
                  {client.entity_type}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  ID: {client.client_id}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Basic Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <Card className="border-cream-dark">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5 text-coral" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{client.email}</p>
            </div>
            {client.phone && (
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium">{client.phone}</p>
              </div>
            )}
            {client.date_of_birth && client.entity_type === 'Individual' && (
              <div>
                <p className="text-sm text-gray-600">Date of Birth</p>
                <p className="font-medium">{formatDate(client.date_of_birth)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Information */}
        <Card className="border-cream-dark">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-coral" />
              Review Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Review Frequency</p>
              <p className="font-medium">{client.review_frequency || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Next Review Date</p>
              <p className="font-medium">{formatDate(client.next_review_date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Client Since</p>
              <p className="font-medium">{formatDate(client.client_since)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Advisory Information */}
        <Card className="border-cream-dark">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-coral" />
              Advisory Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Assigned Adviser</p>
              <p className="font-medium">{client.assigned_adviser || 'Not assigned'}</p>
            </div>
            {client.risk_profile && (
              <div>
                <p className="text-sm text-gray-600">Risk Profile</p>
                <Badge className={`${
                  client.risk_profile === 'Conservative' ? 'bg-blue-100 text-blue-800' :
                  client.risk_profile === 'Balanced' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {client.risk_profile}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href={`/clients/${client.id}/documents`}>
          <Card className="border-cream-dark hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-6 text-center">
              <FileText className="h-8 w-8 text-coral mx-auto mb-3" />
              <h3 className="font-medium text-black mb-1">Documents</h3>
              <p className="text-xs text-gray-600">Manage client files</p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/clients/${client.id}/portfolio`}>
          <Card className="border-cream-dark hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-6 text-center">
              <PieChart className="h-8 w-8 text-coral mx-auto mb-3" />
              <h3 className="font-medium text-black mb-1">Portfolio</h3>
              <p className="text-xs text-gray-600">View investments</p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/clients/${client.id}/risk-profile`}>
          <Card className="border-cream-dark hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 text-coral mx-auto mb-3" />
              <h3 className="font-medium text-black mb-1">Risk Profile</h3>
              <p className="text-xs text-gray-600">Assessment details</p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/clients/${client.id}/financial`}>
          <Card className="border-cream-dark hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-6 text-center">
              <DollarSign className="h-8 w-8 text-coral mx-auto mb-3" />
              <h3 className="font-medium text-black mb-1">Financial Details</h3>
              <p className="text-xs text-gray-600">Portfolio values & goals</p>
            </CardContent>
          </Card>
        </Link>
      </div>


      {/* Notes Section */}
      {client.notes && (
        <Card className="border-cream-dark">
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{client.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}