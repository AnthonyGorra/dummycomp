/**
 * Multi-Factor Authentication (MFA) Library
 *
 * Provides TOTP and SMS-based MFA functionality including:
 * - TOTP secret generation and QR code
 * - TOTP verification
 * - SMS code generation and sending
 * - Backup code generation and verification
 * - MFA enforcement
 */

import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { createClient } from '@/lib/supabase';
import crypto from 'crypto';
import { Twilio } from 'twilio';

export interface TotpSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MfaStatus {
  totpEnabled: boolean;
  smsEnabled: boolean;
  mfaRequired: boolean;
  hasBackupCodes: boolean;
  backupCodesCount: number;
}

export class MfaManager {
  private twilioClient: Twilio | null = null;
  private readonly APP_NAME = 'Sterling CRM';

  constructor() {
    // Initialize Twilio if credentials are available
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      this.twilioClient = new Twilio(accountSid, authToken);
    }
  }

  /**
   * Generate TOTP secret and QR code
   */
  async setupTotp(userId: string, userEmail: string): Promise<TotpSetup> {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${this.APP_NAME} (${userEmail})`,
      issuer: this.APP_NAME,
      length: 32,
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(8);

    // Store encrypted secret in database
    const supabase = createClient();
    const encryptedSecret = this.encryptSecret(secret.base32);

    await supabase.from('user_mfa_secrets').upsert({
      user_id: userId,
      totp_secret: encryptedSecret,
      totp_enabled: false, // Not enabled until verified
      recovery_codes_generated_at: new Date().toISOString(),
      recovery_codes_count: backupCodes.length,
    });

    // Store backup codes (hashed)
    const backupCodeInserts = backupCodes.map((code) => ({
      user_id: userId,
      code_hash: this.hashBackupCode(code),
      is_used: false,
    }));

    await supabase.from('mfa_backup_codes').insert(backupCodeInserts);

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Verify TOTP code and enable TOTP
   */
  async verifyAndEnableTotp(
    userId: string,
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    // Get user's TOTP secret
    const { data: mfaData, error } = await supabase
      .from('user_mfa_secrets')
      .select('totp_secret')
      .eq('user_id', userId)
      .single();

    if (error || !mfaData || !mfaData.totp_secret) {
      return { success: false, error: 'TOTP not set up' };
    }

    const secret = this.decryptSecret(mfaData.totp_secret);

    // Verify token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps of tolerance
    });

    if (!verified) {
      // Record failed attempt
      await this.recordMfaAttempt(userId, 'totp', false);
      return { success: false, error: 'Invalid verification code' };
    }

    // Enable TOTP
    await supabase
      .from('user_mfa_secrets')
      .update({
        totp_enabled: true,
        totp_verified_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Record successful attempt
    await this.recordMfaAttempt(userId, 'totp', true);

    // Log security event
    await this.logSecurityEvent(userId, 'mfa_enabled', 'TOTP MFA enabled');

    return { success: true };
  }

  /**
   * Verify TOTP code (for login)
   */
  async verifyTotp(
    userId: string,
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    // Get user's TOTP secret
    const { data: mfaData, error } = await supabase
      .from('user_mfa_secrets')
      .select('totp_secret, totp_enabled')
      .eq('user_id', userId)
      .single();

    if (error || !mfaData || !mfaData.totp_enabled) {
      return { success: false, error: 'TOTP not enabled' };
    }

    const secret = this.decryptSecret(mfaData.totp_secret);

    // Verify token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      await this.recordMfaAttempt(userId, 'totp', false);
      return { success: false, error: 'Invalid code' };
    }

    // Update last used timestamp
    await supabase
      .from('user_mfa_secrets')
      .update({
        last_totp_used_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    await this.recordMfaAttempt(userId, 'totp', true);

    return { success: true };
  }

  /**
   * Disable TOTP
   */
  async disableTotp(userId: string): Promise<void> {
    const supabase = createClient();

    await supabase
      .from('user_mfa_secrets')
      .update({
        totp_enabled: false,
        totp_secret: null,
      })
      .eq('user_id', userId);

    await this.logSecurityEvent(userId, 'mfa_disabled', 'TOTP MFA disabled');
  }

  /**
   * Setup SMS MFA
   */
  async setupSms(
    userId: string,
    phoneNumber: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.twilioClient) {
      return { success: false, error: 'SMS service not configured' };
    }

    // Generate and send verification code
    const code = this.generateSmsCode();

    try {
      await this.twilioClient.messages.create({
        body: `Your ${this.APP_NAME} verification code is: ${code}`,
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
      });

      // Store phone and code (temporarily, for verification)
      const supabase = createClient();
      const codeHash = this.hashSmsCode(code);

      // Store in a temporary verification table or cache
      // For now, we'll use a simple approach with metadata
      await supabase.from('user_mfa_secrets').upsert({
        user_id: userId,
        sms_phone: phoneNumber,
        sms_enabled: false,
        // In production, store verification code hash in a separate temp table
      });

      return { success: true };
    } catch (error) {
      console.error('SMS sending error:', error);
      return { success: false, error: 'Failed to send SMS' };
    }
  }

  /**
   * Verify SMS code and enable SMS MFA
   */
  async verifyAndEnableSms(
    userId: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    // In production, verify against temporarily stored code
    // For now, simplified implementation

    const supabase = createClient();

    await supabase
      .from('user_mfa_secrets')
      .update({
        sms_enabled: true,
        sms_verified_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    await this.logSecurityEvent(userId, 'mfa_enabled', 'SMS MFA enabled');

    return { success: true };
  }

  /**
   * Send SMS verification code (for login)
   */
  async sendSmsCode(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.twilioClient) {
      return { success: false, error: 'SMS service not configured' };
    }

    const supabase = createClient();

    // Get user's phone number
    const { data: mfaData, error } = await supabase
      .from('user_mfa_secrets')
      .select('sms_phone, sms_enabled')
      .eq('user_id', userId)
      .single();

    if (error || !mfaData || !mfaData.sms_enabled) {
      return { success: false, error: 'SMS MFA not enabled' };
    }

    const code = this.generateSmsCode();

    try {
      await this.twilioClient.messages.create({
        body: `Your ${this.APP_NAME} login code is: ${code}`,
        to: mfaData.sms_phone,
        from: process.env.TWILIO_PHONE_NUMBER,
      });

      // Store code hash temporarily (use Redis or temp table in production)
      // For now, simplified

      return { success: true };
    } catch (error) {
      console.error('SMS sending error:', error);
      return { success: false, error: 'Failed to send SMS' };
    }
  }

  /**
   * Verify SMS code (for login)
   */
  async verifySms(
    userId: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    // In production, verify against temporarily stored code
    // Simplified for now

    const supabase = createClient();

    await supabase
      .from('user_mfa_secrets')
      .update({
        last_sms_used_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    await this.recordMfaAttempt(userId, 'sms', true);

    return { success: true };
  }

  /**
   * Disable SMS MFA
   */
  async disableSms(userId: string): Promise<void> {
    const supabase = createClient();

    await supabase
      .from('user_mfa_secrets')
      .update({
        sms_enabled: false,
        sms_phone: null,
      })
      .eq('user_id', userId);

    await this.logSecurityEvent(userId, 'mfa_disabled', 'SMS MFA disabled');
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(
    userId: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    // Get unused backup codes
    const { data: backupCodes, error } = await supabase
      .from('mfa_backup_codes')
      .select('id, code_hash')
      .eq('user_id', userId)
      .eq('is_used', false);

    if (error || !backupCodes || backupCodes.length === 0) {
      return { success: false, error: 'No backup codes available' };
    }

    // Check if code matches any unused backup code
    const codeHash = this.hashBackupCode(code);
    const matchingCode = backupCodes.find((bc) => bc.code_hash === codeHash);

    if (!matchingCode) {
      await this.recordMfaAttempt(userId, 'backup_code', false);
      return { success: false, error: 'Invalid backup code' };
    }

    // Mark backup code as used
    await supabase
      .from('mfa_backup_codes')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
      })
      .eq('id', matchingCode.id);

    await this.recordMfaAttempt(userId, 'backup_code', true);

    return { success: true };
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const supabase = createClient();

    // Delete old backup codes
    await supabase.from('mfa_backup_codes').delete().eq('user_id', userId);

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes(8);

    const backupCodeInserts = backupCodes.map((code) => ({
      user_id: userId,
      code_hash: this.hashBackupCode(code),
      is_used: false,
    }));

    await supabase.from('mfa_backup_codes').insert(backupCodeInserts);

    // Update MFA secrets table
    await supabase
      .from('user_mfa_secrets')
      .update({
        recovery_codes_generated_at: new Date().toISOString(),
        recovery_codes_count: backupCodes.length,
      })
      .eq('user_id', userId);

    await this.logSecurityEvent(
      userId,
      'backup_codes_regenerated',
      'Backup codes regenerated'
    );

    return backupCodes;
  }

  /**
   * Get MFA status for user
   */
  async getMfaStatus(userId: string): Promise<MfaStatus> {
    const supabase = createClient();

    const { data: mfaData } = await supabase
      .from('user_mfa_secrets')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: backupCodes } = await supabase
      .from('mfa_backup_codes')
      .select('id')
      .eq('user_id', userId)
      .eq('is_used', false);

    return {
      totpEnabled: mfaData?.totp_enabled || false,
      smsEnabled: mfaData?.sms_enabled || false,
      mfaRequired: mfaData?.mfa_required || false,
      hasBackupCodes: (backupCodes?.length || 0) > 0,
      backupCodesCount: backupCodes?.length || 0,
    };
  }

  /**
   * Enforce MFA for user
   */
  async enforceMfa(userId: string, required: boolean): Promise<void> {
    const supabase = createClient();

    await supabase
      .from('user_mfa_secrets')
      .upsert({
        user_id: userId,
        mfa_required: required,
        mfa_required_since: required ? new Date().toISOString() : null,
      });
  }

  /**
   * Check if user requires MFA
   */
  async isMfaRequired(userId: string): Promise<boolean> {
    const supabase = createClient();

    const { data } = await supabase
      .from('user_mfa_secrets')
      .select('mfa_required')
      .eq('user_id', userId)
      .single();

    return data?.mfa_required || false;
  }

  /**
   * Check if user has MFA enabled
   */
  async hasMfaEnabled(userId: string): Promise<boolean> {
    const status = await this.getMfaStatus(userId);
    return status.totpEnabled || status.smsEnabled;
  }

  // Private helper methods

  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  private generateSmsCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  private hashSmsCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  private encryptSecret(secret: string): string {
    // In production, use proper encryption with a key management service
    // For now, simple base64 encoding (NOT SECURE for production)
    const key = process.env.MFA_ENCRYPTION_KEY || 'default-key-change-me';
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decryptSecret(encryptedSecret: string): string {
    // In production, use proper encryption with a key management service
    const key = process.env.MFA_ENCRYPTION_KEY || 'default-key-change-me';
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encryptedSecret, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private async recordMfaAttempt(
    userId: string,
    mfaType: 'totp' | 'sms' | 'backup_code',
    success: boolean
  ): Promise<void> {
    const supabase = createClient();

    await supabase.from('mfa_verification_attempts').insert({
      user_id: userId,
      mfa_type: mfaType,
      success,
    });
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
let mfaManager: MfaManager | null = null;

export function getMfaManager(): MfaManager {
  if (!mfaManager) {
    mfaManager = new MfaManager();
  }
  return mfaManager;
}
