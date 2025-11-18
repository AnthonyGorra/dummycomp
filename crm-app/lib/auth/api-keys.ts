/**
 * API Key Management
 *
 * Provides secure API key functionality including:
 * - API key generation
 * - API key validation
 * - Rate limiting
 * - Usage tracking
 * - Scoped permissions
 */

import { createClient } from '@/lib/supabase';
import crypto from 'crypto';

export interface ApiKey {
  id: string;
  name: string;
  description?: string;
  keyPrefix: string;
  isActive: boolean;
  scopes: string[];
  rateLimit: {
    perHour: number;
    perDay: number;
  };
  lastUsedAt?: Date;
  usageCount: number;
  expiresAt?: Date;
  createdAt: Date;
}

export interface CreateApiKeyOptions {
  userId: string;
  name: string;
  description?: string;
  scopes?: string[];
  rateLimitPerHour?: number;
  rateLimitPerDay?: number;
  expiresInDays?: number;
  allowedIps?: string[];
}

export interface ApiKeyValidationResult {
  valid: boolean;
  userId?: string;
  apiKeyId?: string;
  scopes?: string[];
  error?: string;
  rateLimitExceeded?: boolean;
}

export class ApiKeyManager {
  private readonly KEY_PREFIX = 'sk_live_';
  private readonly KEY_LENGTH = 32;

  /**
   * Generate a new API key
   */
  async createApiKey(options: CreateApiKeyOptions): Promise<{
    apiKey: string;
    details: ApiKey;
  } | null> {
    // Generate secure API key
    const keyBytes = crypto.randomBytes(this.KEY_LENGTH);
    const apiKey = this.KEY_PREFIX + keyBytes.toString('base64url');
    const keyHash = this.hashApiKey(apiKey);
    const keyPrefix = apiKey.substring(0, 15); // For display

    const supabase = createClient();

    const expiresAt = options.expiresInDays
      ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: options.userId,
        name: options.name,
        description: options.description,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        scopes: options.scopes || [],
        rate_limit_per_hour: options.rateLimitPerHour || 1000,
        rate_limit_per_day: options.rateLimitPerDay || 10000,
        allowed_ips: options.allowedIps || null,
        expires_at: expiresAt?.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating API key:', error);
      return null;
    }

    // Log security event
    await this.logSecurityEvent(
      options.userId,
      'api_key_created',
      `API key "${options.name}" created`
    );

    const details: ApiKey = {
      id: data.id,
      name: data.name,
      description: data.description,
      keyPrefix: data.key_prefix,
      isActive: data.is_active,
      scopes: data.scopes || [],
      rateLimit: {
        perHour: data.rate_limit_per_hour,
        perDay: data.rate_limit_per_day,
      },
      lastUsedAt: data.last_used_at ? new Date(data.last_used_at) : undefined,
      usageCount: data.usage_count,
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
      createdAt: new Date(data.created_at),
    };

    return { apiKey, details };
  }

  /**
   * Validate API key
   */
  async validateApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
    if (!apiKey.startsWith(this.KEY_PREFIX)) {
      return { valid: false, error: 'Invalid API key format' };
    }

    const keyHash = this.hashApiKey(apiKey);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return { valid: false, error: 'Invalid API key' };
    }

    // Check expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false, error: 'API key expired' };
    }

    // Check rate limits
    const rateLimitCheck = await this.checkRateLimit(data.id, {
      perHour: data.rate_limit_per_hour,
      perDay: data.rate_limit_per_day,
    });

    if (!rateLimitCheck.allowed) {
      return {
        valid: false,
        error: 'Rate limit exceeded',
        rateLimitExceeded: true,
      };
    }

    // Update usage
    await this.recordUsage(data.id, data.user_id);

    return {
      valid: true,
      userId: data.user_id,
      apiKeyId: data.id,
      scopes: data.scopes || [],
    };
  }

  /**
   * Check rate limit for API key
   */
  private async checkRateLimit(
    apiKeyId: string,
    limits: { perHour: number; perDay: number }
  ): Promise<{ allowed: boolean; remaining: number }> {
    const supabase = createClient();

    // Check hourly limit
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const { data: hourlyUsage } = await supabase
      .from('api_key_usage')
      .select('id', { count: 'exact' })
      .eq('api_key_id', apiKeyId)
      .gte('created_at', oneHourAgo.toISOString());

    const hourlyCount = hourlyUsage?.length || 0;
    if (hourlyCount >= limits.perHour) {
      return { allowed: false, remaining: 0 };
    }

    // Check daily limit
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { data: dailyUsage } = await supabase
      .from('api_key_usage')
      .select('id', { count: 'exact' })
      .eq('api_key_id', apiKeyId)
      .gte('created_at', oneDayAgo.toISOString());

    const dailyCount = dailyUsage?.length || 0;
    if (dailyCount >= limits.perDay) {
      return { allowed: false, remaining: 0 };
    }

    return {
      allowed: true,
      remaining: Math.min(limits.perHour - hourlyCount, limits.perDay - dailyCount),
    };
  }

  /**
   * Record API key usage
   */
  private async recordUsage(apiKeyId: string, userId: string): Promise<void> {
    const supabase = createClient();

    // Update API key last used timestamp and usage count
    await supabase
      .from('api_keys')
      .update({
        last_used_at: new Date().toISOString(),
        usage_count: supabase.rpc('increment', { row_id: apiKeyId }),
      })
      .eq('id', apiKeyId);

    // Log usage (can be done asynchronously)
    await supabase.from('api_key_usage').insert({
      api_key_id: apiKeyId,
      user_id: userId,
      endpoint: '/', // Will be set by middleware
      method: 'GET', // Will be set by middleware
      status_code: 200,
    });
  }

  /**
   * Log detailed API usage
   */
  async logApiUsage(
    apiKeyId: string,
    userId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTimeMs: number,
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string
  ): Promise<void> {
    const supabase = createClient();

    await supabase.from('api_key_usage').insert({
      api_key_id: apiKeyId,
      user_id: userId,
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      ip_address: ipAddress,
      user_agent: userAgent,
      error_message: errorMessage,
    });
  }

  /**
   * Get user's API keys
   */
  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('Error fetching API keys:', error);
      return [];
    }

    return data.map((key) => ({
      id: key.id,
      name: key.name,
      description: key.description,
      keyPrefix: key.key_prefix,
      isActive: key.is_active,
      scopes: key.scopes || [],
      rateLimit: {
        perHour: key.rate_limit_per_hour,
        perDay: key.rate_limit_per_day,
      },
      lastUsedAt: key.last_used_at ? new Date(key.last_used_at) : undefined,
      usageCount: key.usage_count,
      expiresAt: key.expires_at ? new Date(key.expires_at) : undefined,
      createdAt: new Date(key.created_at),
    }));
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(
    apiKeyId: string,
    userId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    const { error } = await supabase
      .from('api_keys')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_by: userId,
        revoke_reason: reason,
      })
      .eq('id', apiKeyId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error revoking API key:', error);
      return { success: false, error: 'Failed to revoke API key' };
    }

    // Log security event
    await this.logSecurityEvent(
      userId,
      'api_key_revoked',
      `API key revoked${reason ? `: ${reason}` : ''}`
    );

    return { success: true };
  }

  /**
   * Update API key
   */
  async updateApiKey(
    apiKeyId: string,
    userId: string,
    updates: {
      name?: string;
      description?: string;
      scopes?: string[];
      rateLimitPerHour?: number;
      rateLimitPerDay?: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.scopes) updateData.scopes = updates.scopes;
    if (updates.rateLimitPerHour)
      updateData.rate_limit_per_hour = updates.rateLimitPerHour;
    if (updates.rateLimitPerDay)
      updateData.rate_limit_per_day = updates.rateLimitPerDay;

    const { error } = await supabase
      .from('api_keys')
      .update(updateData)
      .eq('id', apiKeyId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating API key:', error);
      return { success: false, error: 'Failed to update API key' };
    }

    return { success: true };
  }

  /**
   * Get API key usage statistics
   */
  async getApiKeyUsage(
    apiKeyId: string,
    userId: string,
    days: number = 7
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
    usageByDay: Array<{ date: string; count: number }>;
  }> {
    const supabase = createClient();

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('api_key_usage')
      .select('*')
      .eq('api_key_id', apiKeyId)
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString());

    if (error || !data) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0,
        usageByDay: [],
      };
    }

    const totalRequests = data.length;
    const successfulRequests = data.filter(
      (r) => r.status_code >= 200 && r.status_code < 300
    ).length;
    const failedRequests = totalRequests - successfulRequests;

    const avgResponseTime =
      data.reduce((sum, r) => sum + (r.response_time_ms || 0), 0) / totalRequests || 0;

    // Group by day
    const usageByDay = data.reduce((acc: any, r) => {
      const date = new Date(r.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const usageByDayArray = Object.entries(usageByDay).map(([date, count]) => ({
      date,
      count: count as number,
    }));

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      avgResponseTime,
      usageByDay: usageByDayArray,
    };
  }

  /**
   * Check if API key has permission
   */
  hasScope(apiKeyScopes: string[], requiredScope: string): boolean {
    return apiKeyScopes.includes(requiredScope) || apiKeyScopes.includes('*');
  }

  /**
   * Check if API key has any of the required scopes
   */
  hasAnyScope(apiKeyScopes: string[], requiredScopes: string[]): boolean {
    return requiredScopes.some((scope) => this.hasScope(apiKeyScopes, scope));
  }

  // Private helper methods

  private hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  private async logSecurityEvent(
    userId: string,
    eventType: string,
    description: string
  ): Promise<void> {
    const supabase = createClient();

    await supabase.from('security_events').insert({
      user_id: userId,
      event_type: eventType,
      description,
      severity: 'Medium',
    });
  }
}

// Singleton instance
let apiKeyManager: ApiKeyManager | null = null;

export function getApiKeyManager(): ApiKeyManager {
  if (!apiKeyManager) {
    apiKeyManager = new ApiKeyManager();
  }
  return apiKeyManager;
}
