import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { AIMessage, AIResponse } from '@/lib/ai/providers'

// Initialize Claude client
let anthropic: Anthropic | null = null

// Initialize client only if API key is available
if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
}

export async function POST(request: NextRequest) {
  try {
    const { messages, provider } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages format' },
        { status: 400 }
      )
    }

    const response: AIResponse = await handleClaudeRequest(messages)

    // Only Claude is supported
    if (provider !== 'claude') {
      return NextResponse.json(
        { error: `Only Claude provider is currently supported. Received: ${provider}` },
        { status: 400 }
      )
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('AI API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleClaudeRequest(messages: AIMessage[]): Promise<AIResponse> {
  if (!anthropic) {
    throw new Error('Anthropic API key not configured. Please add ANTHROPIC_API_KEY to your environment variables.')
  }

  try {
    // Convert messages to Claude format
    const systemMessage = messages.find(m => m.role === 'system')
    const conversationMessages = messages.filter(m => m.role !== 'system')

    const claudeMessages = conversationMessages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }))

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: systemMessage?.content,
      messages: claudeMessages
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    return {
      content: content.text,
      timestamp: new Date().toISOString(),
      tokens_used: response.usage.input_tokens + response.usage.output_tokens,
      provider: 'Claude (Anthropic)',
      model: 'claude-3-5-sonnet-20241022'
    }
  } catch (error) {
    console.error('Claude API Error:', error)
    throw new Error(`Claude API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

