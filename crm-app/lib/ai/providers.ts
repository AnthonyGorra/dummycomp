// AI Provider Configuration and Management

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

export interface AIResponse {
  content: string
  timestamp: string
  tokens_used: number
  provider: string
  model: string
}

export interface AIProvider {
  id: string
  name: string
  description: string
  enabled: boolean
  baseUrl?: string
  model: string
  maxTokens: number
  apiKey?: string
}

export const AI_PROVIDERS: Record<string, AIProvider> = {
  claude: {
    id: 'claude',
    name: 'Claude (Anthropic)',
    description: 'Advanced AI assistant for complex reasoning and analysis',
    enabled: true, // Always enabled for client-side, server will validate
    baseUrl: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096
  }
}

class AIService {
  private currentProvider: string = 'claude'

  setProvider(providerId: string) {
    if (AI_PROVIDERS[providerId]) {
      this.currentProvider = providerId
    }
  }

  async sendMessage(messages: AIMessage[]): Promise<AIResponse> {
    const provider = AI_PROVIDERS[this.currentProvider]
    
    if (!provider) {
      throw new Error(`Provider ${this.currentProvider} not found.`)
    }

    try {
      // Make API call to our backend endpoint
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          provider: this.currentProvider
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('AI Service Error:', error)
      throw new Error(`Failed to get AI response: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  getAvailableProviders(): AIProvider[] {
    return Object.values(AI_PROVIDERS).filter(provider => provider.enabled)
  }

  getCurrentProvider(): AIProvider {
    return AI_PROVIDERS[this.currentProvider]
  }
}

export const aiService = new AIService()

// Utility function to get the first available provider
export function getFirstAvailableProvider(): string {
  return 'claude' // Always return claude since it's our only provider
}