import { SupabaseClient } from '@supabase/supabase-js'
import { WebhookSecurity } from './security'
import { WebhookEvent, WebhookEventType, WebhookLog, WebhookStatus } from '@/types/webhooks'

export class WebhookService {
  private supabase: SupabaseClient
  private maxRetries: number = 3
  private retryDelay: number = 60000 // 1 minute in milliseconds

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Send a webhook event to n8n or configured webhook URLs
   */
  async sendWebhook(event: Omit<WebhookEvent, 'id' | 'timestamp'>): Promise<{
    success: boolean
    logId?: string
    error?: string
  }> {
    try {
      // Get webhook settings for the user
      const { data: settings, error: settingsError } = await this.supabase
        .from('webhook_settings')
        .select('*')
        .eq('user_id', event.user_id || '')
        .single()

      if (settingsError || !settings || !settings.is_enabled) {
        return { success: false, error: 'Webhooks not configured or disabled' }
      }

      // Check if this event type is enabled
      const enabledEvents = settings.enabled_events as string[]
      if (!enabledEvents.includes(event.event)) {
        return { success: false, error: 'Event type not enabled' }
      }

      // Create webhook payload
      const payload = {
        event: event.event,
        data: event.data,
        timestamp: new Date().toISOString(),
        user_id: event.user_id
      }

      // Create initial log entry
      const { data: logData, error: logError } = await this.supabase
        .from('webhook_logs')
        .insert({
          event_type: event.event,
          payload: payload,
          status: 'pending' as WebhookStatus,
          attempts: 0,
          user_id: event.user_id
        })
        .select()
        .single()

      if (logError || !logData) {
        return { success: false, error: 'Failed to create webhook log' }
      }

      // Attempt to deliver the webhook
      const deliveryResult = await this.deliverWebhook(
        settings.n8n_webhook_url,
        payload,
        settings.n8n_api_key,
        settings.webhook_secret,
        logData.id
      )

      return {
        success: deliveryResult.success,
        logId: logData.id,
        error: deliveryResult.error
      }

    } catch (error) {
      console.error('Webhook service error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Deliver webhook to a specific URL
   */
  private async deliverWebhook(
    url: string,
    payload: any,
    apiKey: string,
    secret: string,
    logId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const payloadString = JSON.stringify(payload)
      const headers = WebhookSecurity.generateOutgoingHeaders(
        payloadString,
        secret,
        apiKey
      )

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: payloadString,
        timeout: 30000 // 30 second timeout
      })

      const responseBody = await response.text()

      // Update log with delivery result
      await this.updateWebhookLog(logId, {
        status: response.ok ? 'delivered' : 'failed',
        attempts: 1,
        response_status: response.status,
        response_body: responseBody.slice(0, 1000), // Limit response body size
        error_message: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
      })

      if (response.ok) {
        return { success: true }
      } else {
        // Schedule retry for failed delivery
        await this.scheduleRetry(logId, 1)
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Update log with error
      await this.updateWebhookLog(logId, {
        status: 'failed',
        attempts: 1,
        error_message: errorMessage
      })

      // Schedule retry
      await this.scheduleRetry(logId, 1)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Retry failed webhook delivery
   */
  async retryWebhook(logId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get webhook log
      const { data: log, error: logError } = await this.supabase
        .from('webhook_logs')
        .select('*')
        .eq('id', logId)
        .single()

      if (logError || !log) {
        return { success: false, error: 'Webhook log not found' }
      }

      if (log.attempts >= this.maxRetries) {
        return { success: false, error: 'Maximum retry attempts exceeded' }
      }

      // Get webhook settings
      const { data: settings, error: settingsError } = await this.supabase
        .from('webhook_settings')
        .select('*')
        .eq('user_id', log.user_id || '')
        .single()

      if (settingsError || !settings) {
        return { success: false, error: 'Webhook settings not found' }
      }

      // Update status to retrying
      await this.updateWebhookLog(logId, {
        status: 'retrying'
      })

      // Attempt delivery
      const deliveryResult = await this.deliverWebhookRetry(
        settings.n8n_webhook_url,
        log.payload,
        settings.n8n_api_key,
        settings.webhook_secret,
        logId,
        log.attempts + 1
      )

      return deliveryResult

    } catch (error) {
      console.error('Retry webhook error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Deliver webhook retry attempt
   */
  private async deliverWebhookRetry(
    url: string,
    payload: any,
    apiKey: string,
    secret: string,
    logId: string,
    attempt: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const payloadString = JSON.stringify(payload)
      const headers = WebhookSecurity.generateOutgoingHeaders(
        payloadString,
        secret,
        apiKey
      )

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: payloadString,
        timeout: 30000
      })

      const responseBody = await response.text()

      // Update log with retry result
      await this.updateWebhookLog(logId, {
        status: response.ok ? 'delivered' : 'failed',
        attempts: attempt,
        response_status: response.status,
        response_body: responseBody.slice(0, 1000),
        error_message: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`,
        next_retry_at: null
      })

      if (response.ok) {
        return { success: true }
      } else {
        // Schedule another retry if not exceeded max attempts
        if (attempt < this.maxRetries) {
          await this.scheduleRetry(logId, attempt)
        }
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Update log with error
      await this.updateWebhookLog(logId, {
        status: 'failed',
        attempts: attempt,
        error_message: errorMessage,
        next_retry_at: null
      })

      // Schedule another retry if not exceeded max attempts
      if (attempt < this.maxRetries) {
        await this.scheduleRetry(logId, attempt)
      }

      return { success: false, error: errorMessage }
    }
  }

  /**
   * Schedule a retry for a failed webhook
   */
  private async scheduleRetry(logId: string, currentAttempt: number): Promise<void> {
    if (currentAttempt >= this.maxRetries) {
      return
    }

    // Calculate exponential backoff delay
    const delay = this.retryDelay * Math.pow(2, currentAttempt - 1)
    const nextRetryAt = new Date(Date.now() + delay)

    await this.updateWebhookLog(logId, {
      next_retry_at: nextRetryAt.toISOString()
    })
  }

  /**
   * Update webhook log entry
   */
  private async updateWebhookLog(
    logId: string,
    updates: Partial<Omit<WebhookLog, 'id' | 'created_at'>>
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('webhook_logs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', logId)

      if (error) {
        console.error('Failed to update webhook log:', error)
      }
    } catch (error) {
      console.error('Update webhook log error:', error)
    }
  }

  /**
   * Get webhook logs for a user
   */
  async getWebhookLogs(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<WebhookLog[]> {
    try {
      const { data, error } = await this.supabase
        .from('webhook_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Failed to get webhook logs:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Get webhook logs error:', error)
      return []
    }
  }

  /**
   * Get webhook statistics for a user
   */
  async getWebhookStats(userId: string): Promise<{
    totalEvents: number
    successfulDeliveries: number
    failedDeliveries: number
    pendingDeliveries: number
  }> {
    try {
      const { data, error } = await this.supabase
        .from('webhook_logs')
        .select('status')
        .eq('user_id', userId)

      if (error || !data) {
        return {
          totalEvents: 0,
          successfulDeliveries: 0,
          failedDeliveries: 0,
          pendingDeliveries: 0
        }
      }

      const stats = data.reduce(
        (acc, log) => {
          acc.totalEvents++
          if (log.status === 'delivered') acc.successfulDeliveries++
          if (log.status === 'failed') acc.failedDeliveries++
          if (log.status === 'pending' || log.status === 'retrying') acc.pendingDeliveries++
          return acc
        },
        {
          totalEvents: 0,
          successfulDeliveries: 0,
          failedDeliveries: 0,
          pendingDeliveries: 0
        }
      )

      return stats
    } catch (error) {
      console.error('Get webhook stats error:', error)
      return {
        totalEvents: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        pendingDeliveries: 0
      }
    }
  }

  /**
   * Process pending retries
   */
  async processPendingRetries(): Promise<void> {
    try {
      const { data: pendingRetries, error } = await this.supabase
        .from('webhook_logs')
        .select('*')
        .eq('status', 'failed')
        .not('next_retry_at', 'is', null)
        .lte('next_retry_at', new Date().toISOString())
        .lt('attempts', this.maxRetries)

      if (error || !pendingRetries || pendingRetries.length === 0) {
        return
      }

      // Process each pending retry
      for (const log of pendingRetries) {
        await this.retryWebhook(log.id)
        // Add small delay between retries to avoid overwhelming the target
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (error) {
      console.error('Process pending retries error:', error)
    }
  }
}