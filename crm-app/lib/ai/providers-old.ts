// AI Provider Configuration and Management

export interface AIProvider {
  id: string
  name: string
  description: string
  enabled: boolean
  apiKey?: string
  baseUrl?: string
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp?: string
}

export interface AIResponse {
  content: string
  tokens_used?: number
  model?: string
  provider: string
  timestamp: string
}

export const AI_PROVIDERS: Record<string, AIProvider> = {
  claude: {
    id: 'claude',
    name: 'Claude (Anthropic)',
    description: 'Advanced AI assistant for complex reasoning and analysis',
    enabled: true,
    baseUrl: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096,
    temperature: 0.7
  },
  openai: {
    id: 'openai',
    name: 'OpenAI GPT',
    description: 'Versatile AI model for general purpose tasks',
    enabled: true,
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4',
    maxTokens: 4096,
    temperature: 0.7
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google\'s advanced AI model with multimodal capabilities',
    enabled: true,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    model: 'gemini-pro',
    maxTokens: 4096,
    temperature: 0.7
  },
  local: {
    id: 'local',
    name: 'Local AI Model',
    description: 'Self-hosted AI model for privacy-focused deployments',
    enabled: false,
    baseUrl: 'http://localhost:11434/api/generate',
    model: 'llama2',
    maxTokens: 4096,
    temperature: 0.7
  }
}

export class AIService {
  private currentProvider: string = 'claude'

  setProvider(providerId: string) {
    if (AI_PROVIDERS[providerId]) {
      this.currentProvider = providerId
    }
  }

  getCurrentProvider(): AIProvider {
    return AI_PROVIDERS[this.currentProvider]
  }

  async sendMessage(messages: AIMessage[]): Promise<AIResponse> {
    const provider = this.getCurrentProvider()
    
    if (!provider.enabled) {
      throw new Error(`Provider ${provider.name} is not enabled`)
    }

    // In a real implementation, you would make actual API calls here
    // For demo purposes, we'll simulate responses
    return this.simulateAIResponse(messages, provider)
  }

  private async simulateAIResponse(messages: AIMessage[], provider: AIProvider): Promise<AIResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    const userMessage = messages[messages.length - 1]?.content || ''
    
    // Simple pattern matching for demo
    let response = ''
    
    if (userMessage.toLowerCase().includes('summary') || userMessage.toLowerCase().includes('summarize')) {
      response = this.generateClientSummary(userMessage)
    } else if (userMessage.toLowerCase().includes('portfolio') || userMessage.toLowerCase().includes('investment')) {
      response = this.generatePortfolioInfo(userMessage)
    } else if (userMessage.toLowerCase().includes('risk profile') || userMessage.toLowerCase().includes('risk')) {
      response = this.generateRiskInfo(userMessage)
    } else if (userMessage.toLowerCase().includes('documents') || userMessage.toLowerCase().includes('files')) {
      response = this.generateDocumentInfo(userMessage)
    } else if (userMessage.toLowerCase().includes('contact') || userMessage.toLowerCase().includes('phone') || userMessage.toLowerCase().includes('email')) {
      response = this.generateContactInfo(userMessage)
    } else {
      response = this.generateGeneralResponse(userMessage)
    }

    return {
      content: response,
      tokens_used: Math.floor(Math.random() * 500) + 100,
      model: provider.model,
      provider: provider.name,
      timestamp: new Date().toISOString()
    }
  }

  private generateClientSummary(query: string): string {
    return `## Client Summary

Based on the available client data, here's a comprehensive overview:

**Client Information:**
- **Name:** Michael Smith (Individual Client)
- **Client ID:** CL-0001
- **Contact:** michael.smith@example.com | +61 412 234 567
- **Entity Type:** Individual

**Financial Overview:**
- **Portfolio Value:** $125,000 AUD
- **Risk Profile:** Conservative
- **Investment Goal:** Retirement Planning
- **Client Since:** August 12, 2021

**Service Details:**
- **Assigned Adviser:** Sarah Chen
- **Review Frequency:** Quarterly
- **Next Review:** February 15, 2025

**Key Insights:**
- Conservative investor focused on retirement planning
- Moderate portfolio size suitable for steady growth strategies
- Regular quarterly reviews indicate engaged client relationship
- Portfolio aligns well with conservative risk tolerance

**Recommended Actions:**
1. Prepare for upcoming February review
2. Consider diversification strategies within conservative framework
3. Ensure all compliance documents are current`
  }

  private generatePortfolioInfo(query: string): string {
    return `## Portfolio Analysis

**Current Portfolio Value:** $125,000 AUD

**Asset Allocation Breakdown:**
- **Australian Equities:** 35% ($43,750)
- **International Equities:** 25% ($31,250)
- **Fixed Income:** 30% ($37,500)
- **Cash & Cash Equivalents:** 10% ($12,500)

**Performance Metrics:**
- **YTD Return:** +8.2%
- **1-Year Return:** +10.5%
- **Risk-Adjusted Return:** Aligned with Conservative profile

**Portfolio Health:**
✅ Well-diversified across asset classes
✅ Risk level appropriate for client profile
⚠️ Consider increasing international exposure
✅ Cash allocation within recommended range

**Next Steps:**
- Review asset allocation at next quarterly meeting
- Consider rebalancing if allocation drifts beyond targets`
  }

  private generateRiskInfo(query: string): string {
    return `## Risk Profile Assessment

**Current Risk Profile:** Conservative

**Risk Characteristics:**
- **Risk Tolerance:** Low to Moderate
- **Investment Horizon:** Long-term (10+ years)
- **Risk Capacity:** Moderate based on portfolio size
- **Volatility Tolerance:** Low

**Profile Alignment:**
✅ Portfolio allocation matches Conservative profile
✅ Investment goals align with risk tolerance
✅ Time horizon supports current strategy

**Risk Considerations:**
- Conservative approach may limit growth potential
- Inflation risk with high fixed income allocation
- Consider gradual increase in growth assets over time

**Recommendations:**
1. Annual risk profile review recommended
2. Consider small increase in equity allocation
3. Monitor inflation impact on fixed income returns`
  }

  private generateDocumentInfo(query: string): string {
    return `## Document Summary

**Document Organization:**
Documents are organized across 5 main folders:

📁 **Advice Documents** (1 document)
- Statement of Advice Q1 2024.docx

📁 **Fact Find** (0 documents)
- No documents currently stored

📁 **Risk Profile** (0 documents)
- Risk assessment documents pending

📁 **Compliance & Regulatory** (0 documents)
- Compliance documentation needed

📁 **Portfolio Reports** (1 document)
- Annual Portfolio Report 2023.docx

**Document Status:**
✅ Current SOA available
⚠️ Fact Find documentation missing
⚠️ Risk profile assessment documents needed
✅ Portfolio reporting up to date

**Action Items:**
1. Complete fact find documentation
2. Conduct and document risk profile assessment
3. Ensure all compliance documents are current`
  }

  private generateContactInfo(query: string): string {
    return `## Contact Information

**Primary Contact Details:**
- **Email:** michael.smith@example.com
- **Phone:** +61 412 234 567
- **Preferred Contact Method:** Email (business hours)

**Address:**
42 Ocean Street
Bondi, NSW 2026
Australia

**Communication Preferences:**
- **Best Contact Time:** Business hours (9 AM - 5 PM AEST)
- **Review Meetings:** Quarterly, in-person preferred
- **Documentation:** Email delivery preferred

**Emergency Contact:**
Not currently on file - recommend updating at next review

**Communication History:**
- Last contact: Quarterly review scheduled
- Response time: Typically within 24 hours
- Engagement level: Highly engaged client`
  }

  private generateGeneralResponse(query: string): string {
    return `I can help you with information about your CRM clients. Here's what I can assist you with:

**Available Information:**
- **Client Summaries** - Comprehensive overviews of client profiles
- **Portfolio Analysis** - Investment holdings and performance data
- **Risk Assessments** - Risk profiles and tolerance analysis
- **Document Management** - File organization and compliance status
- **Contact Details** - Communication preferences and history
- **Financial Planning** - Goals, strategies, and recommendations

**Example Queries:**
- "Give me a summary of Michael Smith"
- "What's the portfolio allocation for client CL-0001?"
- "Show me the risk profile for the Williams Family"
- "What documents are missing for this client?"
- "When is the next review scheduled?"

**AI Provider Options:**
- **Claude (Anthropic)** - Currently active
- **OpenAI GPT** - Available
- **Google Gemini** - Available
- **Local AI** - Available for privacy-focused deployments

How can I help you with your client information today?`
  }

  getAvailableProviders(): AIProvider[] {
    return Object.values(AI_PROVIDERS)
  }

  updateProviderConfig(providerId: string, config: Partial<AIProvider>): void {
    if (AI_PROVIDERS[providerId]) {
      AI_PROVIDERS[providerId] = { ...AI_PROVIDERS[providerId], ...config }
    }
  }
}

export const aiService = new AIService()