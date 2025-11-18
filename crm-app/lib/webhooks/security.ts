import crypto from 'crypto'

export class WebhookSecurity {
  private static readonly SIGNATURE_HEADER = 'x-webhook-signature'
  private static readonly API_KEY_HEADER = 'x-n8n-api-key'
  private static readonly TIMESTAMP_HEADER = 'x-webhook-timestamp'
  
  /**
   * Generate HMAC signature for webhook payload
   */
  static generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    try {
      const expectedSignature = this.generateSignature(payload, secret)
      
      // Use crypto.timingSafeEqual to prevent timing attacks
      const providedBuffer = Buffer.from(signature, 'hex')
      const expectedBuffer = Buffer.from(expectedSignature, 'hex')
      
      if (providedBuffer.length !== expectedBuffer.length) {
        return false
      }
      
      return crypto.timingSafeEqual(providedBuffer, expectedBuffer)
    } catch (error) {
      console.error('Signature verification error:', error)
      return false
    }
  }

  /**
   * Verify API key
   */
  static verifyApiKey(providedKey: string, expectedKey: string): boolean {
    if (!providedKey || !expectedKey) {
      return false
    }
    
    try {
      const providedBuffer = Buffer.from(providedKey)
      const expectedBuffer = Buffer.from(expectedKey)
      
      if (providedBuffer.length !== expectedBuffer.length) {
        return false
      }
      
      return crypto.timingSafeEqual(providedBuffer, expectedBuffer)
    } catch (error) {
      console.error('API key verification error:', error)
      return false
    }
  }

  /**
   * Verify timestamp to prevent replay attacks
   */
  static verifyTimestamp(timestamp: string, toleranceSeconds: number = 300): boolean {
    try {
      const webhookTime = parseInt(timestamp, 10) * 1000 // Convert to milliseconds
      const currentTime = Date.now()
      const timeDiff = Math.abs(currentTime - webhookTime)
      
      return timeDiff <= toleranceSeconds * 1000
    } catch (error) {
      console.error('Timestamp verification error:', error)
      return false
    }
  }

  /**
   * Extract and validate headers from request
   */
  static extractHeaders(headers: Headers): {
    signature?: string
    apiKey?: string
    timestamp?: string
  } {
    return {
      signature: headers.get(this.SIGNATURE_HEADER) || undefined,
      apiKey: headers.get(this.API_KEY_HEADER) || undefined,
      timestamp: headers.get(this.TIMESTAMP_HEADER) || undefined,
    }
  }

  /**
   * Generate secure headers for outgoing webhooks
   */
  static generateOutgoingHeaders(
    payload: string,
    secret: string,
    apiKey: string
  ): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const signature = this.generateSignature(payload, secret)
    
    return {
      'Content-Type': 'application/json',
      [this.SIGNATURE_HEADER]: signature,
      [this.API_KEY_HEADER]: apiKey,
      [this.TIMESTAMP_HEADER]: timestamp,
    }
  }

  /**
   * Validate webhook request
   */
  static validateWebhookRequest(
    payload: string,
    headers: Headers,
    expectedApiKey: string,
    secret: string
  ): { valid: boolean; error?: string } {
    const { signature, apiKey, timestamp } = this.extractHeaders(headers)

    // Verify API key
    if (!apiKey || !this.verifyApiKey(apiKey, expectedApiKey)) {
      return { valid: false, error: 'Invalid API key' }
    }

    // Verify timestamp (if provided)
    if (timestamp && !this.verifyTimestamp(timestamp)) {
      return { valid: false, error: 'Timestamp too old or invalid' }
    }

    // Verify signature (if provided)
    if (signature && !this.verifySignature(payload, signature, secret)) {
      return { valid: false, error: 'Invalid signature' }
    }

    return { valid: true }
  }

  /**
   * Generate a secure random API key
   */
  static generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Generate a secure webhook secret
   */
  static generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('base64')
  }
}