import { NextRequest, NextResponse } from 'next/server'
import { aiService, AIMessage } from '@/lib/ai/providers'
import { clientDataService } from '@/lib/ai/client-data'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, provider = 'claude' } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Set the AI provider
    aiService.setProvider(provider)

    // Get the latest user message to understand context
    const userMessage = messages[messages.length - 1]?.content || ''
    
    // Enhanced system context with client data
    const systemMessage: AIMessage = {
      role: 'system',
      content: `You are a helpful CRM AI assistant with access to comprehensive client data. You can provide insights about clients, portfolios, documents, risk profiles, and upcoming reviews.

CURRENT CLIENT DATABASE:
${clientDataService.getAllClientsForAI().map(client => {
  return `• ${client.name} (${client.client_id})
  - Type: ${client.entity_type}
  - Email: ${client.contact.email}
  - Portfolio: ${client.financial.portfolio_value ? '$' + client.financial.portfolio_value.toLocaleString() + ' AUD' : 'Not disclosed'}
  - Risk Profile: ${client.financial.risk_profile || 'Not assessed'}
  - Investment Goal: ${client.financial.investment_goal || 'Not specified'}
  - Adviser: ${client.service.assigned_adviser || 'Not assigned'}
  - Next Review: ${client.service.next_review_date || 'Not scheduled'}
  - Documents: ${client.documents.total_count} total files
  - Address: ${client.contact.address || 'Not provided'}`
}).join('\n\n')}

CAPABILITIES:
- Provide detailed client summaries and analysis
- Answer questions about portfolio values, risk profiles, and investment goals
- Track document status and compliance requirements
- Identify upcoming review dates and scheduling needs
- Compare clients and provide aggregate statistics
- Search for specific client information
- Generate recommendations based on client data

RESPONSE GUIDELINES:
- Use clear, professional language appropriate for financial services
- Format responses with markdown for better readability
- Include specific client IDs and names when relevant
- Provide actionable insights and recommendations
- Use bullet points and tables when presenting multiple data points
- Always be accurate with financial figures and client information

Respond helpfully to the user's query about their CRM data.`
    }

    // Prepare messages for AI service
    const aiMessages: AIMessage[] = [
      systemMessage,
      ...messages.slice(-5) // Include last 5 messages for context
    ]

    // Get AI response
    const response = await aiService.sendMessage(aiMessages)

    return NextResponse.json({
      success: true,
      response
    })

  } catch (error) {
    console.error('AI Chat API Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to get AI response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Handle client-specific queries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const clientId = searchParams.get('clientId')
    const query = searchParams.get('query')

    switch (action) {
      case 'client-summary':
        if (!clientId) {
          return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
        }
        
        const clientData = clientDataService.getClientSummaryData(clientId)
        return NextResponse.json({ data: clientData })

      case 'search-clients':
        if (!query) {
          return NextResponse.json({ error: 'Search query required' }, { status: 400 })
        }
        
        const searchResults = clientDataService.searchClients(query)
        return NextResponse.json({ data: searchResults })

      case 'upcoming-reviews':
        const daysAhead = parseInt(searchParams.get('days') || '30')
        const upcomingReviews = clientDataService.getUpcomingReviews(daysAhead)
        return NextResponse.json({ data: upcomingReviews })

      case 'risk-profile':
        const riskProfile = searchParams.get('profile')
        if (!riskProfile) {
          return NextResponse.json({ error: 'Risk profile required' }, { status: 400 })
        }
        
        const riskClients = clientDataService.getClientsByRiskProfile(riskProfile)
        return NextResponse.json({ data: riskClients })

      case 'adviser-clients':
        const adviser = searchParams.get('adviser')
        if (!adviser) {
          return NextResponse.json({ error: 'Adviser name required' }, { status: 400 })
        }
        
        const adviserClients = clientDataService.getAdviserClientsList(adviser)
        return NextResponse.json({ data: adviserClients })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('AI Data API Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}