/**
 * Account Security & Brute Force Protection
 *
 * Provides comprehensive security features including:
 * - Brute force protection
 * - Account lockout policies
 * - Login attempt tracking
 * - Suspicious activity detection
 * - Security event logging
 */

import { createClient } from '@/lib/supabase';

export interface LoginAttemptOptions {
  email: string;
  userId?: string;
  success: boolean;
  failureReason?: string;
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  city?: string;
}

export interface AccountLockoutStatus {
  isLocked: boolean;
  lockedUntil?: Date;
  reason?: string;
  failedAttempts: number;
}

export interface BruteForceConfig {
  maxAttempts: number;
  windowMinutes: number;
  lockoutMinutes: number;
}

export class SecurityManager {
  private readonly DEFAULT_BRUTE_FORCE_CONFIG: BruteForceConfig = {
    maxAttempts: 5,
    windowMinutes: 15,
    lockoutMinutes: 30,
  };

  /**
   * Record login attempt and check for brute force
   */
  async recordLoginAttempt(
    options: LoginAttemptOptions,
    config: BruteForceConfig = this.DEFAULT_BRUTE_FORCE_CONFIG
  ): Promise<{ shouldLockout: boolean; remainingAttempts?: number }> {
    const supabase = createClient();

    // Record the attempt
    await supabase.from('login_attempts').insert({
      email: options.email,
      user_id: options.userId,
      success: options.success,
      failure_reason: options.failureReason,
      ip_address: options.ipAddress,
      user_agent: options.userAgent,
      country: options.country,
      city: options.city,
    });

    // If successful, reset failed attempts
    if (options.success) {
      return { shouldLockout: false };
    }

    // Count failed attempts in the time window
    const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000);

    const { data: failedAttempts, error } = await supabase
      .from('login_attempts')
      .select('id')
      .eq('email', options.email)
      .eq('success', false)
      .gte('created_at', windowStart.toISOString());

    if (error) {
      console.error('Error counting failed attempts:', error);
      return { shouldLockout: false };
    }

    const failedCount = failedAttempts?.length || 0;

    // Check if we should lockout
    if (failedCount >= config.maxAttempts && options.userId) {
      await this.lockoutAccount(
        options.userId,
        'brute_force',
        config.lockoutMinutes,
        failedCount,
        options.ipAddress
      );

      // Log security event
      await this.logSecurityEvent(
        options.userId,
        'account_locked',
        `Account locked due to ${failedCount} failed login attempts`,
        'High',
        options.ipAddress
      );

      return { shouldLockout: true };
    }

    return {
      shouldLockout: false,
      remainingAttempts: config.maxAttempts - failedCount,
    };
  }

  /**
   * Check if account is locked
   */
  async checkAccountLockout(userId: string): Promise<AccountLockoutStatus> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('account_lockouts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_locked', true)
      .single();

    if (error || !data) {
      return { isLocked: false, failedAttempts: 0 };
    }

    // Check if lockout has expired
    if (data.locked_until) {
      const lockedUntil = new Date(data.locked_until);
      if (lockedUntil < new Date()) {
        // Auto-unlock
        await this.unlockAccount(userId, 'auto_expiry');
        return { isLocked: false, failedAttempts: 0 };
      }

      return {
        isLocked: true,
        lockedUntil,
        reason: data.lockout_reason,
        failedAttempts: data.failed_attempts_count,
      };
    }

    // Manual unlock required
    return {
      isLocked: true,
      reason: data.lockout_reason,
      failedAttempts: data.failed_attempts_count,
    };
  }

  /**
   * Lockout account
   */
  async lockoutAccount(
    userId: string,
    reason: 'brute_force' | 'suspicious_activity' | 'manual' | 'policy_violation' | 'compromised',
    lockoutMinutes?: number,
    failedAttemptsCount: number = 0,
    triggeringIp?: string
  ): Promise<void> {
    const supabase = createClient();

    const lockedUntil = lockoutMinutes
      ? new Date(Date.now() + lockoutMinutes * 60 * 1000)
      : null;

    await supabase.from('account_lockouts').upsert({
      user_id: userId,
      is_locked: true,
      locked_at: new Date().toISOString(),
      locked_until: lockedUntil?.toISOString(),
      lockout_reason: reason,
      failed_attempts_count: failedAttemptsCount,
      triggering_ip: triggeringIp,
    });

    // Update user profile status
    await supabase
      .from('user_profiles')
      .update({ account_status: 'Locked' })
      .eq('user_id', userId);
  }

  /**
   * Unlock account
   */
  async unlockAccount(
    userId: string,
    unlockMethod: 'auto_expiry' | 'admin' | 'password_reset',
    unlockedBy?: string
  ): Promise<void> {
    const supabase = createClient();

    await supabase
      .from('account_lockouts')
      .update({
        is_locked: false,
        unlocked_at: new Date().toISOString(),
        unlocked_by: unlockedBy,
        unlock_method: unlockMethod,
      })
      .eq('user_id', userId);

    // Update user profile status
    await supabase
      .from('user_profiles')
      .update({ account_status: 'Active' })
      .eq('user_id', userId);

    // Log security event
    await this.logSecurityEvent(
      userId,
      'account_unlocked',
      `Account unlocked via ${unlockMethod}`,
      'Medium'
    );
  }

  /**
   * Detect suspicious login activity
   */
  async detectSuspiciousActivity(
    userId: string,
    ipAddress?: string,
    country?: string
  ): Promise<{
    isSuspicious: boolean;
    reasons: string[];
  }> {
    const supabase = createClient();
    const reasons: string[] = [];

    // Get recent successful logins
    const { data: recentLogins } = await supabase
      .from('login_attempts')
      .select('ip_address, country, created_at')
      .eq('user_id', userId)
      .eq('success', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!recentLogins || recentLogins.length === 0) {
      // First login, not suspicious
      return { isSuspicious: false, reasons: [] };
    }

    // Check for new IP address
    const knownIps = recentLogins.map((l) => l.ip_address).filter(Boolean);
    if (ipAddress && !knownIps.includes(ipAddress)) {
      reasons.push('Login from new IP address');
    }

    // Check for new country
    const knownCountries = recentLogins.map((l) => l.country).filter(Boolean);
    if (country && !knownCountries.includes(country)) {
      reasons.push('Login from new country');
    }

    // Check for multiple rapid login attempts from different IPs
    const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
    const { data: recentAttempts } = await supabase
      .from('login_attempts')
      .select('ip_address')
      .eq('user_id', userId)
      .gte('created_at', last5Minutes.toISOString());

    if (recentAttempts && recentAttempts.length > 3) {
      const uniqueIps = new Set(recentAttempts.map((a) => a.ip_address));
      if (uniqueIps.size > 2) {
        reasons.push('Multiple login attempts from different IPs');
      }
    }

    const isSuspicious = reasons.length > 0;

    if (isSuspicious) {
      await this.logSecurityEvent(
        userId,
        'suspicious_login',
        `Suspicious login detected: ${reasons.join(', ')}`,
        'High',
        ipAddress
      );
    }

    return { isSuspicious, reasons };
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    userId: string,
    eventType: string,
    description: string,
    severity: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low',
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const supabase = createClient();

    await supabase.from('security_events').insert({
      user_id: userId,
      event_type: eventType,
      description,
      severity,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: metadata || {},
    });
  }

  /**
   * Get user security events
   */
  async getUserSecurityEvents(
    userId: string,
    limit: number = 50
  ): Promise<any[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('security_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      console.error('Error fetching security events:', error);
      return [];
    }

    return data;
  }

  /**
   * Get recent login attempts
   */
  async getRecentLoginAttempts(
    userId: string,
    limit: number = 20
  ): Promise<any[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('login_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      console.error('Error fetching login attempts:', error);
      return [];
    }

    return data;
  }

  /**
   * Clear old login attempts (cleanup task)
   */
  async cleanupOldLoginAttempts(daysToKeep: number = 30): Promise<void> {
    const supabase = createClient();

    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    await supabase
      .from('login_attempts')
      .delete()
      .lt('created_at', cutoffDate.toISOString());
  }

  /**
   * Get account security summary
   */
  async getAccountSecuritySummary(userId: string): Promise<{
    totalLogins: number;
    failedLogins: number;
    successfulLogins: number;
    uniqueIps: number;
    lastLogin?: Date;
    lastFailedLogin?: Date;
    securityEvents: number;
    isLocked: boolean;
  }> {
    const supabase = createClient();

    // Get last 30 days of login attempts
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { data: loginAttempts } = await supabase
      .from('login_attempts')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const totalLogins = loginAttempts?.length || 0;
    const successfulLogins =
      loginAttempts?.filter((l) => l.success).length || 0;
    const failedLogins = totalLogins - successfulLogins;

    const uniqueIps = new Set(
      loginAttempts?.map((l) => l.ip_address).filter(Boolean) || []
    ).size;

    const lastSuccessful = loginAttempts
      ?.filter((l) => l.success)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    const lastFailed = loginAttempts
      ?.filter((l) => !l.success)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    // Get security events count
    const { data: securityEvents } = await supabase
      .from('security_events')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const securityEventsCount = securityEvents?.length || 0;

    // Check lockout status
    const lockoutStatus = await this.checkAccountLockout(userId);

    return {
      totalLogins,
      failedLogins,
      successfulLogins,
      uniqueIps,
      lastLogin: lastSuccessful ? new Date(lastSuccessful.created_at) : undefined,
      lastFailedLogin: lastFailed ? new Date(lastFailed.created_at) : undefined,
      securityEvents: securityEventsCount,
      isLocked: lockoutStatus.isLocked,
    };
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong';
  } {
    const errors: string[] = [];
    let score = 0;

    // Check length
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    } else if (password.length >= 12) {
      score += 2;
    } else {
      score += 1;
    }

    // Check for uppercase
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      score += 1;
    }

    // Check for lowercase
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      score += 1;
    }

    // Check for numbers
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else {
      score += 1;
    }

    // Check for special characters
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    } else {
      score += 1;
    }

    // Determine strength
    let strength: 'weak' | 'medium' | 'strong';
    if (score < 3) {
      strength = 'weak';
    } else if (score < 5) {
      strength = 'medium';
    } else {
      strength = 'strong';
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength,
    };
  }
}

// Singleton instance
let securityManager: SecurityManager | null = null;

export function getSecurityManager(): SecurityManager {
  if (!securityManager) {
    securityManager = new SecurityManager();
  }
  return securityManager;
}
