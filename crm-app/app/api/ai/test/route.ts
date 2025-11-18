import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY
    const keyLength = process.env.ANTHROPIC_API_KEY?.length || 0
    const keyPrefix = process.env.ANTHROPIC_API_KEY?.substring(0, 15) || 'not set'
    
    return NextResponse.json({
      hasKey: hasAnthropicKey,
      keyLength,
      keyPrefix: hasAnthropicKey ? keyPrefix + '...' : 'not set',
      status: hasAnthropicKey ? 'ready' : 'missing'
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check API key status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}