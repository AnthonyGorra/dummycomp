/**
 * OAuth 2.0 Provider Integration
 *
 * Supports multiple OAuth providers:
 * - Google
 * - Microsoft
 * - LinkedIn
 *
 * Features:
 * - Authorization flow
 * - Token exchange
 * - Token refresh
 * - User profile fetching
 */

import { createClient } from '@/lib/supabase';
import crypto from 'crypto';
import axios from 'axios';

export interface OAuthProvider {
  id: string;
  providerName: string;
  displayName: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userinfoUrl: string;
  scopes: string[];
  isEnabled: boolean;
}

export interface OAuthAuthorizationUrl {
  url: string;
  state: string;
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
}

export interface OAuthUserInfo {
  providerId: string;
  providerUserId: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  profileData: Record<string, any>;
}

export class OAuthManager {
  /**
   * Get all enabled OAuth providers
   */
  async getEnabledProviders(): Promise<OAuthProvider[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('oauth_providers')
      .select('*')
      .eq('is_enabled', true);

    if (error || !data) {
      console.error('Error fetching OAuth providers:', error);
      return [];
    }

    return data.map((p) => ({
      id: p.id,
      providerName: p.provider_name,
      displayName: p.display_name,
      clientId: p.client_id,
      clientSecret: p.client_secret,
      authorizationUrl: p.authorization_url,
      tokenUrl: p.token_url,
      userinfoUrl: p.userinfo_url,
      scopes: p.scopes || [],
      isEnabled: p.is_enabled,
    }));
  }

  /**
   * Get OAuth provider by name
   */
  async getProvider(providerName: string): Promise<OAuthProvider | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('oauth_providers')
      .select('*')
      .eq('provider_name', providerName)
      .eq('is_enabled', true)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      providerName: data.provider_name,
      displayName: data.display_name,
      clientId: data.client_id,
      clientSecret: data.client_secret,
      authorizationUrl: data.authorization_url,
      tokenUrl: data.token_url,
      userinfoUrl: data.userinfo_url,
      scopes: data.scopes || [],
      isEnabled: data.is_enabled,
    };
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  async getAuthorizationUrl(
    providerName: string,
    redirectUri: string
  ): Promise<OAuthAuthorizationUrl | null> {
    const provider = await this.getProvider(providerName);
    if (!provider) {
      return null;
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: provider.scopes.join(' '),
      state,
    });

    // Provider-specific parameters
    if (providerName === 'google') {
      params.append('access_type', 'offline');
      params.append('prompt', 'consent');
    }

    const url = `${provider.authorizationUrl}?${params.toString()}`;

    // Store state in database for verification
    const supabase = createClient();
    await supabase.from('oauth_authorization_codes').insert({
      code: state,
      provider_id: provider.id,
      redirect_uri: redirectUri,
      state,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    });

    return { url, state };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    providerName: string,
    code: string,
    redirectUri: string
  ): Promise<OAuthTokenResponse | null> {
    const provider = await this.getProvider(providerName);
    if (!provider) {
      return null;
    }

    try {
      const params = new URLSearchParams({
        client_id: provider.clientId,
        client_secret: provider.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });

      const response = await axios.post(provider.tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const data = response.data;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
        scope: data.scope,
      };
    } catch (error) {
      console.error('Token exchange error:', error);
      return null;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    providerName: string,
    refreshToken: string
  ): Promise<OAuthTokenResponse | null> {
    const provider = await this.getProvider(providerName);
    if (!provider) {
      return null;
    }

    try {
      const params = new URLSearchParams({
        client_id: provider.clientId,
        client_secret: provider.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      const response = await axios.post(provider.tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const data = response.data;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
        scope: data.scope,
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  /**
   * Fetch user info from OAuth provider
   */
  async getUserInfo(
    providerName: string,
    accessToken: string
  ): Promise<OAuthUserInfo | null> {
    const provider = await this.getProvider(providerName);
    if (!provider) {
      return null;
    }

    try {
      const response = await axios.get(provider.userinfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = response.data;

      // Parse provider-specific user data
      return this.parseUserInfo(providerName, provider.id, data);
    } catch (error) {
      console.error('User info fetch error:', error);
      return null;
    }
  }

  /**
   * Connect OAuth account to user
   */
  async connectOAuthAccount(
    userId: string,
    providerName: string,
    code: string,
    redirectUri: string
  ): Promise<{ success: boolean; error?: string }> {
    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(providerName, code, redirectUri);
    if (!tokens) {
      return { success: false, error: 'Failed to exchange code for tokens' };
    }

    // Get user info
    const userInfo = await this.getUserInfo(providerName, tokens.accessToken);
    if (!userInfo) {
      return { success: false, error: 'Failed to fetch user info' };
    }

    // Store OAuth connection
    const supabase = createClient();

    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    const { error } = await supabase.from('oauth_connections').upsert({
      user_id: userId,
      provider_id: userInfo.providerId,
      provider_user_id: userInfo.providerUserId,
      provider_email: userInfo.email,
      access_token: this.encryptToken(tokens.accessToken),
      refresh_token: tokens.refreshToken
        ? this.encryptToken(tokens.refreshToken)
        : null,
      token_expires_at: expiresAt.toISOString(),
      profile_data: userInfo.profileData,
      is_active: true,
      last_authenticated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error storing OAuth connection:', error);
      return { success: false, error: 'Failed to store OAuth connection' };
    }

    return { success: true };
  }

  /**
   * Disconnect OAuth account
   */
  async disconnectOAuthAccount(
    userId: string,
    providerId: string
  ): Promise<void> {
    const supabase = createClient();

    await supabase
      .from('oauth_connections')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('provider_id', providerId);
  }

  /**
   * Get user's OAuth connections
   */
  async getUserOAuthConnections(userId: string): Promise<any[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('oauth_connections')
      .select(
        `
        *,
        oauth_providers (
          provider_name,
          display_name,
          icon_url
        )
      `
      )
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error || !data) {
      return [];
    }

    return data;
  }

  // Private helper methods

  private parseUserInfo(
    providerName: string,
    providerId: string,
    data: any
  ): OAuthUserInfo {
    switch (providerName) {
      case 'google':
        return {
          providerId,
          providerUserId: data.id || data.sub,
          email: data.email,
          name: data.name,
          firstName: data.given_name,
          lastName: data.family_name,
          avatarUrl: data.picture,
          profileData: data,
        };

      case 'microsoft':
        return {
          providerId,
          providerUserId: data.id,
          email: data.mail || data.userPrincipalName,
          name: data.displayName,
          firstName: data.givenName,
          lastName: data.surname,
          avatarUrl: undefined,
          profileData: data,
        };

      case 'linkedin':
        return {
          providerId,
          providerUserId: data.id,
          email: data.email,
          name: `${data.localizedFirstName} ${data.localizedLastName}`,
          firstName: data.localizedFirstName,
          lastName: data.localizedLastName,
          avatarUrl: data.profilePicture?.displayImage,
          profileData: data,
        };

      default:
        return {
          providerId,
          providerUserId: data.id,
          email: data.email,
          profileData: data,
        };
    }
  }

  private encryptToken(token: string): string {
    // In production, use proper encryption with KMS
    const key = process.env.OAUTH_ENCRYPTION_KEY || 'default-key-change-me';
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decryptToken(encryptedToken: string): string {
    // In production, use proper encryption with KMS
    const key = process.env.OAUTH_ENCRYPTION_KEY || 'default-key-change-me';
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

// Singleton instance
let oauthManager: OAuthManager | null = null;

export function getOAuthManager(): OAuthManager {
  if (!oauthManager) {
    oauthManager = new OAuthManager();
  }
  return oauthManager;
}
