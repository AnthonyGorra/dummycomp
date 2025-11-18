import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { AIMessage, AIResponse } from '@/lib/ai/providers'
import { z } from 'zod'
import {
  validateRequestBody,
  checkRequestSize,
  REQUEST_SIZE_LIMITS,
  getClientIp,
  auditAndSanitizeXSS,
  auditRequestInputs,
} from '@/lib/security'

// Initialize Claude client
let anthropic: Anthropic | null = null

// Initialize client only if API key is available
if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
}

// Validation schema for chat request
const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string().max(10000),
    })
  ).min(1).max(50),
  provider: z.enum(['claude']).optional(),
})

export async function POST(request: NextRequest) {
  try {
    // 1. Check request size
    const sizeCheck = checkRequestSize(request, REQUEST_SIZE_LIMITS.MEDIUM)
    if (!sizeCheck.valid) {
      return sizeCheck.error
    }

    // 2. Validate request body
    const validation = await validateRequestBody(request, chatRequestSchema)
    if (!validation.success) {
      return validation.error
    }

    const { messages, provider } = validation.data

    // 3. Audit for XSS and SQL injection attempts
    const clientIp = getClientIp(request)
    const auditResult = auditRequestInputs(
      { messages, provider },
      'api.ai.chat',
      { ipAddress: clientIp }
    )

    if (!auditResult.valid) {
      console.warn('Suspicious input detected:', auditResult.errors)
      return NextResponse.json(
        { error: 'Invalid input detected', details: auditResult.errors },
        { status: 400 }
      )
    }

    // 4. Sanitize messages for XSS
    const sanitizedMessages = messages.map((msg) => ({
      ...msg,
      content: auditAndSanitizeXSS(msg.content, 'ai.chat.message', {
        ipAddress: clientIp,
      }).sanitized,
    }))

    // 5. Process the request
    const response: AIResponse = await handleClaudeRequest(sanitizedMessages)

    // Only Claude is supported
    if (provider && provider !== 'claude') {
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

