'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Mail, Phone, MoreHorizontal, DollarSign, Calendar, Target, User, PieChart, FileText, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { webhookEmitter } from '@/lib/webhooks'
import { Client } from '@/lib/types/client'
import { mockClients } from '@/lib/data/mock-clients'

interface ClientWithId extends Client {
  id: string
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientWithId[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientWithId | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    street_address: '',
    city: '',
    state: '',
    postcode: '',
    portfolio_value: '',
    risk_profile: 'Balanced' as 'Conservative' | 'Balanced' | 'Growth',
    client_since: '',
    investment_goal: '',
    assigned_adviser: '',
    review_frequency: 'Quarterly' as 'Quarterly' | 'Semi-annually' | 'Annually',
    next_review_date: '',
    notes: ''
  })

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    // Add IDs to mock clients
    const clientsWithIds: ClientWithId[] = mockClients.map((client, index) => ({
      ...client,
      id: (index + 1).toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'demo-user'
    }))
    setClients(clientsWithIds)
    setLoading(false)
  }

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Get current user for webhook
      const { data: { user } } = await supabase.auth.getUser()
      
      // In a real app, this would save to Supabase
      const newClient: ClientWithId = {
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: user?.id || 'demo-user',
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || undefined,
        date_of_birth: formData.date_of_birth || undefined,
        street_address: formData.street_address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        postcode: formData.postcode || undefined,
        portfolio_value: formData.portfolio_value ? parseFloat(formData.portfolio_value) : undefined,
        risk_profile: formData.risk_profile,
        client_since: formData.client_since || undefined,
        investment_goal: formData.investment_goal || undefined,
        assigned_adviser: formData.assigned_adviser || undefined,
        review_frequency: formData.review_frequency,
        next_review_date: formData.next_review_date || undefined,
        notes: formData.notes || undefined
      }
      
      setClients([...clients, newClient])
      setIsAddDialogOpen(false)
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        street_address: '',
        city: '',
        state: '',
        postcode: '',
        portfolio_value: '',
        risk_profile: 'Balanced',
        client_since: '',
        investment_goal: '',
        assigned_adviser: '',
        review_frequency: 'Quarterly',
        next_review_date: '',
        notes: ''
      })
      
      toast({
        title: 'Success',
        description: 'Client added successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add client',
        variant: 'destructive',
      })
    }
  }

  const filteredClients = clients.filter(client =>
    `${client.first_name} ${client.last_name} ${client.email} ${client.assigned_adviser || ''} ${client.investment_goal || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleClientClick = (client: ClientWithId) => {
    // Navigate to individual client page instead of opening modal
    window.location.href = `/clients/${client.id}`
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-AU')
  }

  const getRiskProfileColor = (profile?: string) => {
    switch (profile) {
      case 'Conservative': return 'bg-blue-100 text-blue-800'
      case 'Balanced': return 'bg-yellow-100 text-yellow-800'
      case 'Growth': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-black">Clients</h1>
          <p className="text-muted-foreground mt-2">Manage your financial advisory clients and portfolios</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="bg-coral hover:bg-coral-dark">
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white border-cream-dark focus:border-coral focus:ring-coral"
        />
      </div>

      {/* Clients List - Simple name boxes */}
      <div className="space-y-2">
        {filteredClients.map((client) => (
          <Card 
            key={client.id} 
            className="p-3 hover:shadow-md transition-all border-cream-dark cursor-pointer bg-white hover:bg-cream-light"
            onClick={() => handleClientClick(client)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8 bg-coral-light">
                  <AvatarFallback className="bg-coral text-white text-sm">
                    {getInitials(client.first_name, client.last_name)}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-medium text-black hover:text-coral transition-colors">
                  {client.first_name} {client.last_name}
                </h3>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.location.href = `/clients/${client.id}`; }}>View Details</DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Edit</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600" onClick={(e) => e.stopPropagation()}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Client Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Enter the client details below
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddClient}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                    className="bg-cream-light border-cream-dark"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                    className="bg-cream-light border-cream-dark"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="bg-cream-light border-cream-dark"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-cream-light border-cream-dark"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="bg-cream-light border-cream-dark"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="portfolio_value">Portfolio Value</Label>
                <Input
                  id="portfolio_value"
                  type="number"
                  value={formData.portfolio_value}
                  onChange={(e) => setFormData({ ...formData, portfolio_value: e.target.value })}
                  className="bg-cream-light border-cream-dark"
                  placeholder="Enter amount in AUD"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assigned_adviser">Assigned Adviser</Label>
                <Input
                  id="assigned_adviser"
                  value={formData.assigned_adviser}
                  onChange={(e) => setFormData({ ...formData, assigned_adviser: e.target.value })}
                  className="bg-cream-light border-cream-dark"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-coral hover:bg-coral-dark">
                Add Client
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Client Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[700px] bg-white max-h-[80vh] overflow-y-auto">
          {selectedClient && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 bg-coral-light">
                    <AvatarFallback className="bg-coral text-white">
                      {getInitials(selectedClient.first_name, selectedClient.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-xl font-semibold">
                      {selectedClient.first_name} {selectedClient.last_name}
                    </div>
                    {selectedClient.risk_profile && (
                      <Badge className={`text-xs ${getRiskProfileColor(selectedClient.risk_profile)}`}>
                        {selectedClient.risk_profile}
                      </Badge>
                    )}
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-6 py-4">
                {/* Contact Information */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg text-black">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{selectedClient.email}</span>
                    </div>
                    {selectedClient.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{selectedClient.phone}</span>
                      </div>
                    )}
                    {selectedClient.date_of_birth && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">Born: {formatDate(selectedClient.date_of_birth)}</span>
                      </div>
                    )}
                  </div>
                  
                  {(selectedClient.street_address || selectedClient.city) && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Address:</p>
                      <p className="text-sm text-gray-600">
                        {selectedClient.street_address && `${selectedClient.street_address}, `}
                        {selectedClient.city && `${selectedClient.city} `}
                        {selectedClient.state && `${selectedClient.state} `}
                        {selectedClient.postcode}
                      </p>
                    </div>
                  )}
                </div>

                {/* Financial Information */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg text-black">Financial Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedClient.portfolio_value && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">Portfolio: {formatCurrency(selectedClient.portfolio_value)}</span>
                      </div>
                    )}
                    {selectedClient.investment_goal && (
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{selectedClient.investment_goal}</span>
                      </div>
                    )}
                    {selectedClient.client_since && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">Client since: {formatDate(selectedClient.client_since)}</span>
                      </div>
                    )}
                    {selectedClient.review_frequency && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">Reviews: {selectedClient.review_frequency}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Advisory Information */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg text-black">Advisory Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedClient.assigned_adviser && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">Adviser: {selectedClient.assigned_adviser}</span>
                      </div>
                    )}
                    {selectedClient.next_review_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">Next review: {formatDate(selectedClient.next_review_date)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg text-black">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Button 
                      variant="outline" 
                      className="justify-start h-auto p-4"
                      onClick={() => {
                        setIsDetailDialogOpen(false)
                        window.open(`/clients/${selectedClient.id}/portfolio`, '_blank')
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <PieChart className="h-5 w-5 text-coral" />
                        <div className="text-left">
                          <div className="font-medium">Portfolio</div>
                          <div className="text-xs text-muted-foreground">View holdings & performance</div>
                        </div>
                      </div>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="justify-start h-auto p-4"
                      onClick={() => {
                        setIsDetailDialogOpen(false)
                        window.open(`/clients/${selectedClient.id}/risk-profile`, '_blank')
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-5 w-5 text-coral" />
                        <div className="text-left">
                          <div className="font-medium">Risk Profile</div>
                          <div className="text-xs text-muted-foreground">Assessment & questionnaire</div>
                        </div>
                      </div>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="justify-start h-auto p-4"
                      onClick={() => {
                        setIsDetailDialogOpen(false)
                        // This would navigate to documents page when implemented
                        window.open(`/clients/${selectedClient.id}/documents`, '_blank')
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-coral" />
                        <div className="text-left">
                          <div className="font-medium">Documents</div>
                          <div className="text-xs text-muted-foreground">SOA, reports & compliance</div>
                        </div>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* Notes */}
                {selectedClient.notes && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg text-black">Notes</h3>
                    <p className="text-sm text-gray-600 bg-cream-light p-3 rounded-md">
                      {selectedClient.notes}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}