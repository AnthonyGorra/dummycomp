/**
 * Redis-backed Session Manager
 *
 * Provides secure, scalable session management with:
 * - Redis for fast session storage
 * - Database persistence for audit and recovery
 * - Automatic session expiration
 * - Multi-device tracking
 * - Session revocation
 */

import { createClient as createRedisClient, RedisClientType } from 'redis';
import { createClient } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { UAParser } from 'ua-parser-js';

export interface SessionData {
  id: string;
  userId: string;
  sessionToken: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  deviceName?: string;
  browser?: string;
  os?: string;
  mfaVerified: boolean;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
}

export interface CreateSessionOptions {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  mfaVerified?: boolean;
  expiresInSeconds?: number;
}

export class SessionManager {
  private redisClient: RedisClientType | null = null;
  private isRedisConnected = false;
  private readonly SESSION_PREFIX = 'session:';
  private readonly USER_SESSIONS_PREFIX = 'user_sessions:';
  private readonly DEFAULT_TTL = 60 * 60 * 24 * 7; // 7 days

  constructor() {
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.redisClient = createRedisClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis: Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isRedisConnected = false;
      });

      this.redisClient.on('connect', () => {
        console.log('Redis Client Connected');
        this.isRedisConnected = true;
      });

      await this.redisClient.connect();
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.isRedisConnected = false;
    }
  }

  /**
   * Parse user agent to extract device information
   */
  private parseUserAgent(userAgent?: string): {
    deviceType?: string;
    deviceName?: string;
    browser?: string;
    os?: string;
  } {
    if (!userAgent) return {};

    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    return {
      deviceType: result.device.type || 'Desktop',
      deviceName: result.device.model || result.browser.name,
      browser: `${result.browser.name} ${result.browser.version}`,
      os: `${result.os.name} ${result.os.version}`,
    };
  }

  /**
   * Create a new session
   */
  async createSession(options: CreateSessionOptions): Promise<SessionData> {
    const sessionId = uuidv4();
    const sessionToken = this.generateSessionToken();
    const expiresInSeconds = options.expiresInSeconds || this.DEFAULT_TTL;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000);

    const deviceInfo = this.parseUserAgent(options.userAgent);

    const sessionData: SessionData = {
      id: sessionId,
      userId: options.userId,
      sessionToken,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      ...deviceInfo,
      mfaVerified: options.mfaVerified || false,
      createdAt: now,
      expiresAt,
      lastActivityAt: now,
    };

    // Store in Redis (if available)
    if (this.isRedisConnected && this.redisClient) {
      try {
        const redisKey = this.SESSION_PREFIX + sessionToken;
        const userSessionsKey = this.USER_SESSIONS_PREFIX + options.userId;

        await this.redisClient.setEx(
          redisKey,
          expiresInSeconds,
          JSON.stringify(sessionData)
        );

        // Add to user's session set
        await this.redisClient.sAdd(userSessionsKey, sessionToken);
        await this.redisClient.expire(userSessionsKey, expiresInSeconds);
      } catch (error) {
        console.error('Redis session creation error:', error);
      }
    }

    // Persist to database
    const supabase = createClient();
    await supabase.from('user_sessions').insert({
      id: sessionId,
      user_id: options.userId,
      session_token: sessionToken,
      ip_address: options.ipAddress,
      user_agent: options.userAgent,
      device_type: deviceInfo.deviceType,
      device_name: deviceInfo.deviceName,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      is_active: true,
      mfa_verified: options.mfaVerified || false,
      expires_at: expiresAt.toISOString(),
    });

    return sessionData;
  }

  /**
   * Get session by token
   */
  async getSession(sessionToken: string): Promise<SessionData | null> {
    // Try Redis first
    if (this.isRedisConnected && this.redisClient) {
      try {
        const redisKey = this.SESSION_PREFIX + sessionToken;
        const data = await this.redisClient.get(redisKey);

        if (data) {
          const session = JSON.parse(data) as SessionData;

          // Update last activity
          await this.updateSessionActivity(sessionToken);

          return session;
        }
      } catch (error) {
        console.error('Redis session retrieval error:', error);
      }
    }

    // Fallback to database
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    // Check expiration
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      await this.revokeSession(sessionToken);
      return null;
    }

    const session: SessionData = {
      id: data.id,
      userId: data.user_id,
      sessionToken: data.session_token,
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      deviceType: data.device_type,
      deviceName: data.device_name,
      browser: data.browser,
      os: data.os,
      mfaVerified: data.mfa_verified,
      createdAt: new Date(data.created_at),
      expiresAt: new Date(data.expires_at),
      lastActivityAt: new Date(data.last_activity_at),
    };

    // Restore to Redis
    if (this.isRedisConnected && this.redisClient) {
      try {
        const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
        if (ttl > 0) {
          const redisKey = this.SESSION_PREFIX + sessionToken;
          await this.redisClient.setEx(redisKey, ttl, JSON.stringify(session));
        }
      } catch (error) {
        console.error('Redis session restoration error:', error);
      }
    }

    await this.updateSessionActivity(sessionToken);

    return session;
  }

  /**
   * Update session activity timestamp
   */
  async updateSessionActivity(sessionToken: string): Promise<void> {
    const now = new Date();

    // Update in Redis
    if (this.isRedisConnected && this.redisClient) {
      try {
        const redisKey = this.SESSION_PREFIX + sessionToken;
        const data = await this.redisClient.get(redisKey);

        if (data) {
          const session = JSON.parse(data);
          session.lastActivityAt = now;

          const ttl = await this.redisClient.ttl(redisKey);
          if (ttl > 0) {
            await this.redisClient.setEx(redisKey, ttl, JSON.stringify(session));
          }
        }
      } catch (error) {
        console.error('Redis activity update error:', error);
      }
    }

    // Update in database (throttled to every 5 minutes)
    const supabase = createClient();
    await supabase
      .from('user_sessions')
      .update({ last_activity_at: now.toISOString() })
      .eq('session_token', sessionToken);
  }

  /**
   * Revoke a session
   */
  async revokeSession(
    sessionToken: string,
    revokedBy?: string,
    reason?: string
  ): Promise<void> {
    // Remove from Redis
    if (this.isRedisConnected && this.redisClient) {
      try {
        const redisKey = this.SESSION_PREFIX + sessionToken;
        const data = await this.redisClient.get(redisKey);

        if (data) {
          const session = JSON.parse(data);
          const userSessionsKey = this.USER_SESSIONS_PREFIX + session.userId;

          await this.redisClient.del(redisKey);
          await this.redisClient.sRem(userSessionsKey, sessionToken);
        }
      } catch (error) {
        console.error('Redis session revocation error:', error);
      }
    }

    // Update database
    const supabase = createClient();
    await supabase
      .from('user_sessions')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_by: revokedBy,
        revoke_reason: reason,
      })
      .eq('session_token', sessionToken);
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllUserSessions(
    userId: string,
    exceptToken?: string
  ): Promise<void> {
    // Remove from Redis
    if (this.isRedisConnected && this.redisClient) {
      try {
        const userSessionsKey = this.USER_SESSIONS_PREFIX + userId;
        const sessionTokens = await this.redisClient.sMembers(userSessionsKey);

        for (const token of sessionTokens) {
          if (token !== exceptToken) {
            const redisKey = this.SESSION_PREFIX + token;
            await this.redisClient.del(redisKey);
            await this.redisClient.sRem(userSessionsKey, token);
          }
        }
      } catch (error) {
        console.error('Redis bulk revocation error:', error);
      }
    }

    // Update database
    const supabase = createClient();
    const query = supabase
      .from('user_sessions')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoke_reason: 'All sessions revoked',
      })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (exceptToken) {
      query.neq('session_token', exceptToken);
    }

    await query;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_activity_at', { ascending: false });

    if (error || !data) return [];

    return data.map((session) => ({
      id: session.id,
      userId: session.user_id,
      sessionToken: session.session_token,
      ipAddress: session.ip_address,
      userAgent: session.user_agent,
      deviceType: session.device_type,
      deviceName: session.device_name,
      browser: session.browser,
      os: session.os,
      mfaVerified: session.mfa_verified,
      createdAt: new Date(session.created_at),
      expiresAt: new Date(session.expires_at),
      lastActivityAt: new Date(session.last_activity_at),
    }));
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    const supabase = createClient();
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('is_active', true)
      .lt('expires_at', new Date().toISOString());
  }

  /**
   * Generate a secure session token
   */
  private generateSessionToken(): string {
    const randomBytes = require('crypto').randomBytes(32);
    return randomBytes.toString('base64url');
  }

  /**
   * Verify MFA for session
   */
  async verifyMfaForSession(sessionToken: string): Promise<void> {
    const now = new Date();

    // Update Redis
    if (this.isRedisConnected && this.redisClient) {
      try {
        const redisKey = this.SESSION_PREFIX + sessionToken;
        const data = await this.redisClient.get(redisKey);

        if (data) {
          const session = JSON.parse(data);
          session.mfaVerified = true;

          const ttl = await this.redisClient.ttl(redisKey);
          if (ttl > 0) {
            await this.redisClient.setEx(redisKey, ttl, JSON.stringify(session));
          }
        }
      } catch (error) {
        console.error('Redis MFA verification error:', error);
      }
    }

    // Update database
    const supabase = createClient();
    await supabase
      .from('user_sessions')
      .update({
        mfa_verified: true,
        mfa_verified_at: now.toISOString(),
      })
      .eq('session_token', sessionToken);
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.redisClient && this.isRedisConnected) {
      await this.redisClient.disconnect();
      this.isRedisConnected = false;
    }
  }
}

// Singleton instance
let sessionManager: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!sessionManager) {
    sessionManager = new SessionManager();
  }
  return sessionManager;
}
