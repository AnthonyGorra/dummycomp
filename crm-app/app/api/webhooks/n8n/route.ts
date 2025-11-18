import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { WebhookSecurity } from '@/lib/webhooks/security'
import { WebhookEventType } from '@/types/webhooks'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get environment variables
    const expectedApiKey = process.env.N8N_API_KEY
    const webhookSecret = process.env.WEBHOOK_SECRET
    
    if (!expectedApiKey || !webhookSecret) {
      console.error('Missing webhook configuration')
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      )
    }

    // Get request payload
    const payload = await request.text()
    
    // Validate webhook request
    const validation = WebhookSecurity.validateWebhookRequest(
      payload,
      request.headers,
      expectedApiKey,
      webhookSecret
    )

    if (!validation.valid) {
      console.error('Webhook validation failed:', validation.error)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse JSON payload
    let data: any
    try {
      data = JSON.parse(payload)
    } catch (error) {
      console.error('Invalid JSON payload:', error)
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!data.event || !data.data) {
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

    if (!validEvents.includes(data.event)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      )
    }

    // Log the incoming webhook
    const { error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        event_type: data.event,
        payload: data,
        status: 'delivered',
        attempts: 1,
        response_status: 200,
        response_body: 'Success'
      })

    if (logError) {
      console.error('Failed to log webhook:', logError)
    }

    // Process the webhook based on event type
    try {
      await processWebhookEvent(data.event, data.data, supabase)
    } catch (processingError) {
      console.error('Webhook processing error:', processingError)
      
      // Update log with error
      await supabase
        .from('webhook_logs')
        .update({
          status: 'failed',
          error_message: processingError instanceof Error ? processingError.message : 'Unknown error'
        })
        .eq('event_type', data.event)
        .eq('status', 'delivered')
        .order('created_at', { ascending: false })
        .limit(1)

      return NextResponse.json(
        { error: 'Webhook processing failed' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        message: 'Webhook received successfully',
        event: data.event,
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Webhook endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processWebhookEvent(
  event: WebhookEventType,
  data: any,
  supabase: any
) {
  // Process different webhook events
  switch (event) {
    case 'contact.created':
      // Handle external contact creation
      // Could sync with external systems or trigger workflows
      console.log('Processing contact.created webhook:', data)
      break
      
    case 'contact.updated':
      // Handle external contact updates
      console.log('Processing contact.updated webhook:', data)
      break
      
    case 'deal.stage_changed':
      // Handle external deal stage changes
      // Could trigger notifications or update related records
      console.log('Processing deal.stage_changed webhook:', data)
      break
      
    case 'company.created':
      // Handle external company creation
      console.log('Processing company.created webhook:', data)
      break
      
    // Add more event handlers as needed
    default:
      console.log(`Processing ${event} webhook:`, data)
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'n8n webhook endpoint is active',
      timestamp: new Date().toISOString(),
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