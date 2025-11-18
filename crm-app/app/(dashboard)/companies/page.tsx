'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Globe, Phone, MoreHorizontal, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
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
import { createClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { webhookEmitter } from '@/lib/webhooks'

interface Company {
  id: string
  name: string
  industry: string | null
  website: string | null
  phone: string | null
  address: string | null
  contactCount: number
  dealCount: number
}

const ITEMS_PER_PAGE = 12

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    website: '',
    phone: '',
    address: ''
  })

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    // Mock data for demonstration
    setCompanies([
      {
        id: '1',
        name: 'Acme Corporation',
        industry: 'Technology',
        website: 'https://acme.com',
        phone: '+1 555 0100',
        address: '123 Tech Street, Silicon Valley, CA',
        contactCount: 8,
        dealCount: 3
      },
      {
        id: '2',
        name: 'Global Industries',
        industry: 'Manufacturing',
        website: 'https://globalind.com',
        phone: '+1 555 0200',
        address: '456 Industrial Ave, Detroit, MI',
        contactCount: 12,
        dealCount: 5
      },
      {
        id: '3',
        name: 'StartupXYZ',
        industry: 'Software',
        website: 'https://startupxyz.io',
        phone: '+1 555 0300',
        address: '789 Innovation Blvd, Austin, TX',
        contactCount: 4,
        dealCount: 2
      }
    ])
    setLoading(false)
  }

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Get current user for webhook
      const { data: { user } } = await supabase.auth.getUser()
      
      // In a real app, this would save to Supabase
      const newCompany: Company = {
        id: Date.now().toString(),
        name: formData.name,
        industry: formData.industry || null,
        website: formData.website || null,
        phone: formData.phone || null,
        address: formData.address || null,
        contactCount: 0,
        dealCount: 0
      }
      
      setCompanies([...companies, newCompany])
      setIsAddDialogOpen(false)
      setFormData({
        name: '',
        industry: '',
        website: '',
        phone: '',
        address: ''
      })
      
      // Emit webhook event for company creation
      if (user) {
        await webhookEmitter.emitCompanyCreated(newCompany, user.id)
      }
      
      toast({
        title: 'Success',
        description: 'Company added successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add company',
        variant: 'destructive',
      })
    }
  }

  // Memoize filtered and paginated companies for performance
  const filteredCompanies = useMemo(() => {
    return companies.filter(company =>
      `${company.name} ${company.industry}`.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [companies, searchQuery])

  const totalPages = Math.ceil(filteredCompanies.length / ITEMS_PER_PAGE)

  const paginatedCompanies = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredCompanies.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredCompanies, currentPage])

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const getIndustryColor = (industry: string | null) => {
    if (!industry) return 'bg-gray-100 text-gray-800'
    const colors: { [key: string]: string } = {
      'Technology': 'bg-blue-100 text-blue-800',
      'Manufacturing': 'bg-green-100 text-green-800',
      'Software': 'bg-purple-100 text-purple-800',
      'Finance': 'bg-yellow-100 text-yellow-800',
      'Healthcare': 'bg-red-100 text-red-800',
    }
    return colors[industry] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-black">Companies</h1>
          <p className="text-muted-foreground mt-2">Manage your business relationships</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="bg-coral hover:bg-coral-dark">
          <Plus className="mr-2 h-4 w-4" />
          Add Company
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Search companies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white border-cream-dark focus:border-coral focus:ring-coral"
        />
      </div>

      {/* Companies Grid with pagination */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {paginatedCompanies.map((company) => (
            <Card key={company.id} className="hover:shadow-lg transition-shadow border-cream-dark">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-coral-light rounded-lg">
                      <Building2 className="h-6 w-6 text-coral-dark" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-black">{company.name}</h3>
                      {company.industry && (
                        <Badge variant="secondary" className={`mt-1 ${getIndustryColor(company.industry)}`}>
                          {company.industry}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {company.website && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Globe className="h-4 w-4 mr-2" />
                      <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:text-coral">
                        {company.website}
                      </a>
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {company.phone}
                    </div>
                  )}
                  {company.address && (
                    <div className="text-sm text-gray-600 mt-2">
                      {company.address}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-cream">
                  <div className="text-sm">
                    <span className="font-medium">{company.contactCount}</span>
                    <span className="text-gray-600 ml-1">contacts</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">{company.dealCount}</span>
                    <span className="text-gray-600 ml-1">deals</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={ITEMS_PER_PAGE}
            totalItems={filteredCompanies.length}
          />
        )}
      </div>

      {/* Add Company Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle>Add New Company</DialogTitle>
            <DialogDescription>
              Enter the company details below
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCompany}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="bg-cream-light border-cream-dark"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="bg-cream-light border-cream-dark"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="bg-cream-light border-cream-dark"
                />
              </div>
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
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="bg-cream-light border-cream-dark"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-coral hover:bg-coral-dark">
                Add Company
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}