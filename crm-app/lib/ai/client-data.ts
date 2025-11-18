// Client Data Service for AI Integration

import { mockClients } from '@/lib/data/mock-clients'

export interface ClientDataForAI {
  id: string
  client_id: string
  name: string
  entity_type: 'Individual' | 'Family'
  contact: {
    email: string
    phone?: string
    address?: string
  }
  financial: {
    portfolio_value?: number
    risk_profile?: string
    investment_goal?: string
  }
  service: {
    assigned_adviser?: string
    client_since?: string
    review_frequency?: string
    next_review_date?: string
  }
  documents: {
    total_count: number
    by_folder: Record<string, number>
    recent_uploads: string[]
  }
  notes?: string
}

export class ClientDataService {
  private getClientDocuments(clientId: string) {
    // In a real implementation, this would fetch from your document storage
    // For demo, we'll simulate document counts
    const mockDocumentCounts = {
      'advice-documents': Math.floor(Math.random() * 5),
      'fact-find': Math.floor(Math.random() * 3),
      'risk-profile': Math.floor(Math.random() * 2),
      'compliance-regulatory': Math.floor(Math.random() * 4),
      'portfolio-reports': Math.floor(Math.random() * 6)
    }

    const totalCount = Object.values(mockDocumentCounts).reduce((sum, count) => sum + count, 0)

    return {
      total_count: totalCount,
      by_folder: mockDocumentCounts,
      recent_uploads: [
        'Statement of Advice Q1 2024.docx',
        'Risk Assessment Form.pdf',
        'Portfolio Report Dec 2023.docx'
      ].slice(0, Math.floor(Math.random() * 3) + 1)
    }
  }

  getClientForAI(clientId: string): ClientDataForAI | null {
    const clientIndex = parseInt(clientId) - 1
    const client = mockClients[clientIndex]
    
    if (!client) return null

    const isFamily = client.last_name.includes('Family')
    const documents = this.getClientDocuments(clientId)

    return {
      id: clientId,
      client_id: `CL-${String(parseInt(clientId)).padStart(4, '0')}`,
      name: isFamily ? 
        (client.last_name.includes('Family') ? client.last_name : `${client.last_name} Family`) :
        `${client.first_name} ${client.last_name}`,
      entity_type: isFamily ? 'Family' : 'Individual',
      contact: {
        email: client.email,
        phone: client.phone,
        address: client.street_address ? 
          `${client.street_address}, ${client.city}, ${client.state} ${client.postcode}` : 
          undefined
      },
      financial: {
        portfolio_value: client.portfolio_value,
        risk_profile: client.risk_profile,
        investment_goal: client.investment_goal
      },
      service: {
        assigned_adviser: client.assigned_adviser,
        client_since: client.client_since,
        review_frequency: client.review_frequency,
        next_review_date: client.next_review_date
      },
      documents,
      notes: client.notes
    }
  }

  getAllClientsForAI(): ClientDataForAI[] {
    return mockClients.map((_, index) => {
      const clientId = (index + 1).toString()
      return this.getClientForAI(clientId)
    }).filter(Boolean) as ClientDataForAI[]
  }

  searchClients(query: string): ClientDataForAI[] {
    const allClients = this.getAllClientsForAI()
    const searchTerm = query.toLowerCase()

    return allClients.filter(client => 
      client.name.toLowerCase().includes(searchTerm) ||
      client.client_id.toLowerCase().includes(searchTerm) ||
      client.contact.email.toLowerCase().includes(searchTerm) ||
      client.service.assigned_adviser?.toLowerCase().includes(searchTerm) ||
      client.financial.investment_goal?.toLowerCase().includes(searchTerm)
    )
  }

  getClientSummaryData(clientId: string): string {
    const client = this.getClientForAI(clientId)
    if (!client) return 'Client not found'

    return `
CLIENT SUMMARY DATA:
===================

Basic Information:
- Name: ${client.name}
- Client ID: ${client.client_id}
- Entity Type: ${client.entity_type}
- Email: ${client.contact.email}
- Phone: ${client.contact.phone || 'Not provided'}
- Address: ${client.contact.address || 'Not provided'}

Financial Information:
- Portfolio Value: ${client.financial.portfolio_value ? `$${client.financial.portfolio_value.toLocaleString()} AUD` : 'Not disclosed'}
- Risk Profile: ${client.financial.risk_profile || 'Not assessed'}
- Investment Goal: ${client.financial.investment_goal || 'Not specified'}

Service Information:
- Assigned Adviser: ${client.service.assigned_adviser || 'Not assigned'}
- Client Since: ${client.service.client_since || 'Not specified'}
- Review Frequency: ${client.service.review_frequency || 'Not set'}
- Next Review: ${client.service.next_review_date || 'Not scheduled'}

Document Status:
- Total Documents: ${client.documents.total_count}
- Advice Documents: ${client.documents.by_folder['advice-documents'] || 0}
- Fact Find: ${client.documents.by_folder['fact-find'] || 0}
- Risk Profile: ${client.documents.by_folder['risk-profile'] || 0}
- Compliance: ${client.documents.by_folder['compliance-regulatory'] || 0}
- Portfolio Reports: ${client.documents.by_folder['portfolio-reports'] || 0}
- Recent Uploads: ${client.documents.recent_uploads.join(', ') || 'None'}

Additional Notes:
${client.notes || 'No additional notes'}
    `.trim()
  }

  getMultipleClientsSummary(clientIds: string[]): string {
    const clients = clientIds.map(id => this.getClientForAI(id)).filter(Boolean) as ClientDataForAI[]
    
    if (clients.length === 0) return 'No clients found'

    let summary = `MULTIPLE CLIENTS SUMMARY:\n========================\n\n`
    
    clients.forEach((client, index) => {
      summary += `${index + 1}. ${client.name} (${client.client_id})\n`
      summary += `   - Entity: ${client.entity_type}\n`
      summary += `   - Portfolio: ${client.financial.portfolio_value ? `$${client.financial.portfolio_value.toLocaleString()}` : 'N/A'}\n`
      summary += `   - Risk: ${client.financial.risk_profile || 'N/A'}\n`
      summary += `   - Adviser: ${client.service.assigned_adviser || 'N/A'}\n`
      summary += `   - Next Review: ${client.service.next_review_date || 'N/A'}\n\n`
    })

    // Add aggregate statistics
    const totalPortfolioValue = clients.reduce((sum, client) => 
      sum + (client.financial.portfolio_value || 0), 0)
    
    const riskProfiles = clients.reduce((acc, client) => {
      if (client.financial.risk_profile) {
        acc[client.financial.risk_profile] = (acc[client.financial.risk_profile] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    summary += `AGGREGATE STATISTICS:\n`
    summary += `- Total Clients: ${clients.length}\n`
    summary += `- Combined Portfolio Value: $${totalPortfolioValue.toLocaleString()} AUD\n`
    summary += `- Risk Profile Distribution: ${Object.entries(riskProfiles).map(([risk, count]) => `${risk}: ${count}`).join(', ')}\n`

    return summary
  }

  getAdviserClientsList(adviserName: string): ClientDataForAI[] {
    return this.getAllClientsForAI().filter(client => 
      client.service.assigned_adviser?.toLowerCase().includes(adviserName.toLowerCase())
    )
  }

  getClientsByRiskProfile(riskProfile: string): ClientDataForAI[] {
    return this.getAllClientsForAI().filter(client => 
      client.financial.risk_profile?.toLowerCase() === riskProfile.toLowerCase()
    )
  }

  getUpcomingReviews(daysAhead: number = 30): ClientDataForAI[] {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + daysAhead)

    return this.getAllClientsForAI().filter(client => {
      if (!client.service.next_review_date) return false
      
      const reviewDate = new Date(client.service.next_review_date)
      return reviewDate <= targetDate && reviewDate >= new Date()
    })
  }
}

export const clientDataService = new ClientDataService()