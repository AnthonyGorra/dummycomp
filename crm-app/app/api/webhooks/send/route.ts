import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { WebhookService } from '@/lib/webhooks/service'
import { WebhookEventType } from '@/types/webhooks'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verify user authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    
    // Validate required fields
    if (!body.event || !body.data) {
      return NextResponse.json(
        { error: 'Missing required fields: event, data' },
        { status: 400 }
      )
    }

    // Validate event type
    const validEvents: WebhookEventType[] = [
      'contact.created',
      'contact.updated',
      'contact.deleted',
      'deal.created',
      'deal.updated',
      'deal.stage_changed',
      'company.created',
      'company.updated',
      'note.created',
      'file.uploaded',
      'activity.logged'
    ]

    if (!validEvents.includes(body.event)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      )
    }

    // Initialize webhook service
    const webhookService = new WebhookService(supabase)
    
    // Send webhook
    const result = await webhookService.sendWebhook({
      event: body.event,
      data: body.data,
      user_id: user.id
    })

    if (result.success) {
      return NextResponse.json(
        {
          message: 'Webhook sent successfully',
          id: result.logId,
          timestamp: new Date().toISOString()
        },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        {
          error: 'Failed to send webhook',
          message: result.error
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Send webhook endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'Webhook send endpoint is active',
      usage: 'POST with { event, data } to send webhook',
      supportedEvents: [
        'contact.created',
        'contact.updated',
        'contact.deleted',
        'deal.created',
        'deal.updated',
        'deal.stage_changed',
        'company.created',
        'company.updated',
        'note.created',
        'file.uploaded',
        'activity.logged'
      ]
    },
    { status: 200 }
  )
}