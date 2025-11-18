# Authentication & Authorization Features

This document describes the comprehensive authentication and authorization system that has been added to the CRM application.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Database Schema](#database-schema)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Usage](#usage)
7. [API Reference](#api-reference)
8. [Security Best Practices](#security-best-practices)
9. [Troubleshooting](#troubleshooting)

## Overview

The authentication and authorization system provides enterprise-grade security features including:

- **Multi-Factor Authentication (MFA)** - TOTP and SMS-based two-factor authentication
- **Session Management** - Redis-backed session storage with device tracking
- **OAuth 2.0** - Social login support for Google, Microsoft, and LinkedIn
- **Role-Based Access Control (RBAC)** - Fine-grained permission management
- **API Key Management** - Secure API key generation and validation
- **Brute Force Protection** - Account lockout policies and rate limiting
- **Security Auditing** - Comprehensive security event logging

## Features

### 1. Multi-Factor Authentication (MFA)

#### TOTP (Time-based One-Time Password)
- QR code generation for authenticator apps (Google Authenticator, Authy, etc.)
- 6-digit time-based codes with 30-second validity window
- Backup codes for account recovery

#### SMS Verification
- Twilio integration for SMS code delivery
- Configurable phone number verification
- Fallback option when TOTP is unavailable

#### Implementation
```typescript
import { getMfaManager } from '@/lib/auth/mfa';

const mfaManager = getMfaManager();

// Setup TOTP
const { secret, qrCodeUrl, backupCodes } = await mfaManager.setupTotp(userId, userEmail);

// Verify TOTP code
const result = await mfaManager.verifyTotp(userId, code);

// Setup SMS
await mfaManager.setupSms(userId, phoneNumber);
```

### 2. Session Management

#### Features
- Redis-backed session storage for performance
- PostgreSQL persistence for reliability and audit
- Device fingerprinting and tracking
- Active session monitoring
- Session revocation (logout all devices)

#### Implementation
```typescript
import { getSessionManager } from '@/lib/auth/session-manager';

const sessionManager = getSessionManager();

// Create session
const session = await sessionManager.createSession({
  userId,
  ipAddress,
  userAgent,
  mfaVerified: true,
});

// Get session
const session = await sessionManager.getSession(sessionToken);

// Revoke session
await sessionManager.revokeSession(sessionToken);
```

### 3. OAuth 2.0 Providers

#### Supported Providers
- **Google** - Google Sign-In
- **Microsoft** - Microsoft/Azure AD authentication
- **LinkedIn** - LinkedIn professional network login

#### Implementation
```typescript
import { getOAuthManager } from '@/lib/auth/oauth';

const oauthManager = getOAuthManager();

// Get authorization URL
const { url, state } = await oauthManager.getAuthorizationUrl('google', redirectUri);

// Exchange code for tokens
const tokens = await oauthManager.exchangeCodeForTokens('google', code, redirectUri);

// Connect OAuth account
await oauthManager.connectOAuthAccount(userId, 'google', code, redirectUri);
```

### 4. Role-Based Access Control (RBAC)

#### Default Roles
- `super_admin` - Full system access (Level 100)
- `admin` - Administrative access (Level 90)
- `manager` - Client and report management (Level 70)
- `adviser` - Standard adviser access (Level 50)
- `junior_adviser` - Limited adviser access (Level 30)
- `readonly` - View-only access (Level 10)

#### Permissions
Permissions follow the format: `resource.action`

Examples:
- `clients.create`, `clients.read`, `clients.update`, `clients.delete`
- `portfolios.read`, `portfolios.update`, `portfolios.trade`
- `reports.read`, `reports.create`, `reports.export`
- `users.read`, `users.create`, `users.update`, `users.delete`

#### Implementation
```typescript
import { hasPermission, hasRole, getUserPermissions } from '@/lib/auth/rbac';

// Check permission
const canCreateClient = await hasPermission(userId, 'clients.create');

// Check role
const isAdmin = await hasRole(userId, 'admin');

// Get all permissions
const permissions = await getUserPermissions(userId);
```

### 5. API Key Management

#### Features
- Secure API key generation (SHA-256 hashing)
- Scoped permissions
- Rate limiting (per hour/per day)
- Usage tracking and analytics
- IP whitelisting
- Key expiration

#### Implementation
```typescript
import { getApiKeyManager } from '@/lib/auth/api-keys';

const apiKeyManager = getApiKeyManager();

// Create API key
const { apiKey, details } = await apiKeyManager.createApiKey({
  userId,
  name: 'Production API Key',
  scopes: ['clients.read', 'portfolios.read'],
  rateLimitPerHour: 1000,
  expiresInDays: 90,
});

// Validate API key
const result = await apiKeyManager.validateApiKey(apiKey);
```

### 6. Brute Force Protection

#### Features
- Login attempt tracking
- Configurable lockout thresholds
- Temporary and permanent lockouts
- IP-based tracking
- Suspicious activity detection

#### Configuration
```env
MAX_LOGIN_ATTEMPTS=5
LOGIN_ATTEMPT_WINDOW_MINUTES=15
ACCOUNT_LOCKOUT_MINUTES=30
```

#### Implementation
```typescript
import { getSecurityManager } from '@/lib/auth/security';

const securityManager = getSecurityManager();

// Record login attempt
const { shouldLockout, remainingAttempts } = await securityManager.recordLoginAttempt({
  email,
  userId,
  success: false,
  ipAddress,
});

// Check lockout status
const status = await securityManager.checkAccountLockout(userId);
```

## Database Schema

### Authentication Tables

The authentication extension adds the following tables:

#### RBAC Tables
- `roles` - System and custom roles
- `permissions` - Available permissions
- `role_permissions` - Role-permission mappings
- `user_roles` - User-role assignments
- `user_profiles` - Extended user profile information

#### MFA Tables
- `user_mfa_secrets` - TOTP and SMS configuration
- `mfa_backup_codes` - Recovery codes
- `mfa_verification_attempts` - MFA attempt tracking

#### Session Tables
- `user_sessions` - Active sessions
- `session_activity` - Session activity log

#### Security Tables
- `login_attempts` - Login attempt tracking
- `account_lockouts` - Account lockout records
- `security_events` - Security event log

#### API Key Tables
- `api_keys` - API key records
- `api_key_usage` - API usage logs

#### OAuth Tables
- `oauth_providers` - OAuth provider configurations
- `oauth_connections` - User OAuth connections
- `oauth_authorization_codes` - Temporary authorization codes

#### Audit Tables
- `audit_logs` - Comprehensive audit trail

### Applying the Schema

Run both schema files on your Supabase instance:

```bash
# 1. Apply base schema (if not already done)
psql -h your-supabase-host -U postgres -d postgres -f supabase_schema.sql

# 2. Apply authentication extension
psql -h your-supabase-host -U postgres -d postgres -f supabase_auth_extension.sql
```

Or use the Supabase dashboard to execute the SQL files.

## Installation

### 1. Install Dependencies

```bash
cd crm-app
npm install
```

New dependencies include:
- `redis` - Redis client for session management
- `speakeasy` - TOTP generation and verification
- `qrcode` - QR code generation for TOTP setup
- `twilio` - SMS delivery for MFA
- `axios` - HTTP client for OAuth
- `ua-parser-js` - User agent parsing for device tracking
- `uuid` - UUID generation

### 2. Set Up Redis

#### Using Docker Compose (Recommended)

```bash
docker-compose up -d redis
```

#### Local Installation

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis-server
```

**Windows:**
Use Docker Desktop or WSL2

### 3. Apply Database Migrations

Execute the SQL schema files in your Supabase instance:

1. Go to Supabase Dashboard → SQL Editor
2. Run `supabase_schema.sql` (if not already done)
3. Run `supabase_auth_extension.sql`

### 4. Configure Environment Variables

Copy `.env.example` to `.env.local` and update:

```bash
cp .env.example .env.local
```

Update the following variables:

```env
# Redis
REDIS_URL=redis://localhost:6379

# MFA Encryption (generate with: openssl rand -base64 32)
MFA_ENCRYPTION_KEY=your-secure-key-here

# OAuth Encryption
OAUTH_ENCRYPTION_KEY=your-secure-key-here

# Twilio (for SMS MFA)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
```

## Configuration

### OAuth Provider Setup

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create OAuth Client ID
5. Set authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret

#### Microsoft OAuth

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory → App Registrations
3. Click "New registration"
4. Set redirect URI: `http://localhost:3000/api/auth/callback/microsoft`
5. Go to Certificates & secrets → New client secret
6. Copy Application (client) ID and client secret value

#### LinkedIn OAuth

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create a new app
3. Add redirect URL: `http://localhost:3000/api/auth/callback/linkedin`
4. Copy Client ID and Client Secret

### Twilio Setup for SMS MFA

1. Sign up at [Twilio](https://www.twilio.com/)
2. Get a phone number
3. Copy Account SID and Auth Token from dashboard
4. Add the phone number to environment variables

## Usage

### Protecting Routes with RBAC

```typescript
// In API route or middleware
import { hasPermission } from '@/lib/auth/rbac';

export async function GET(request: Request) {
  const userId = await getCurrentUserId(); // Your auth logic

  // Check permission
  if (!await hasPermission(userId, 'clients.read')) {
    return new Response('Forbidden', { status: 403 });
  }

  // Continue with protected logic
}
```

### Implementing MFA Flow

```typescript
// 1. Setup MFA
const mfaManager = getMfaManager();
const { secret, qrCodeUrl, backupCodes } = await mfaManager.setupTotp(userId, email);

// Display QR code to user
// User scans with authenticator app

// 2. Verify and enable
const verifyResult = await mfaManager.verifyAndEnableTotp(userId, userCode);

// 3. During login, verify MFA
const mfaResult = await mfaManager.verifyTotp(userId, userCode);
if (mfaResult.success) {
  // Mark session as MFA verified
  await sessionManager.verifyMfaForSession(sessionToken);
}
```

### Creating API Keys

```typescript
const apiKeyManager = getApiKeyManager();

const { apiKey, details } = await apiKeyManager.createApiKey({
  userId,
  name: 'Mobile App Key',
  description: 'API key for mobile application',
  scopes: ['clients.read', 'portfolios.read'],
  rateLimitPerHour: 500,
  rateLimitPerDay: 5000,
  expiresInDays: 365,
});

// Show API key to user (only shown once)
console.log('API Key:', apiKey);
```

## API Reference

### Session Manager

```typescript
class SessionManager {
  async createSession(options: CreateSessionOptions): Promise<SessionData>
  async getSession(sessionToken: string): Promise<SessionData | null>
  async revokeSession(sessionToken: string): Promise<void>
  async revokeAllUserSessions(userId: string, exceptToken?: string): Promise<void>
  async getUserSessions(userId: string): Promise<SessionData[]>
  async verifyMfaForSession(sessionToken: string): Promise<void>
}
```

### MFA Manager

```typescript
class MfaManager {
  async setupTotp(userId: string, userEmail: string): Promise<TotpSetup>
  async verifyAndEnableTotp(userId: string, token: string): Promise<Result>
  async verifyTotp(userId: string, token: string): Promise<Result>
  async setupSms(userId: string, phoneNumber: string): Promise<Result>
  async verifySms(userId: string, code: string): Promise<Result>
  async verifyBackupCode(userId: string, code: string): Promise<Result>
  async getMfaStatus(userId: string): Promise<MfaStatus>
}
```

### RBAC Functions

```typescript
async function hasPermission(userId: string, permissionName: string): Promise<boolean>
async function hasRole(userId: string, roleName: string): Promise<boolean>
async function getUserPermissions(userId: string): Promise<Set<string>>
async function assignRole(userId: string, roleId: string): Promise<Result>
```

### Security Manager

```typescript
class SecurityManager {
  async recordLoginAttempt(options: LoginAttemptOptions): Promise<Result>
  async checkAccountLockout(userId: string): Promise<AccountLockoutStatus>
  async lockoutAccount(userId: string, reason: string): Promise<void>
  async unlockAccount(userId: string, method: string): Promise<void>
  async detectSuspiciousActivity(userId: string, ipAddress?: string): Promise<Result>
}
```

## Security Best Practices

### 1. Environment Variables

- **Never commit `.env` files** to version control
- Generate strong encryption keys: `openssl rand -base64 32`
- Rotate keys regularly (every 90 days recommended)
- Use different keys for development and production

### 2. Redis Security

- Enable Redis authentication: `requirepass your-strong-password`
- Disable dangerous commands: `rename-command FLUSHDB ""`
- Use TLS for Redis connections in production
- Regularly backup Redis data

### 3. Rate Limiting

- Set appropriate API key rate limits
- Monitor for unusual usage patterns
- Implement IP-based rate limiting for login endpoints

### 4. Session Security

- Set short session expiry for sensitive operations
- Revoke all sessions on password change
- Log out inactive sessions automatically
- Use secure, httpOnly cookies

### 5. Password Policies

- Minimum 8 characters
- Require uppercase, lowercase, numbers, and special characters
- Implement password history (prevent reuse)
- Enforce regular password changes

### 6. MFA Recommendations

- Require MFA for admin accounts
- Provide both TOTP and SMS options
- Generate and store backup codes securely
- Monitor MFA verification attempts

## Troubleshooting

### Redis Connection Issues

**Error: "ECONNREFUSED 127.0.0.1:6379"**

Solution:
```bash
# Check if Redis is running
redis-cli ping

# Start Redis
# macOS: brew services start redis
# Linux: sudo systemctl start redis-server
```

### Session Not Persisting

Check:
1. Redis is running and accessible
2. `REDIS_URL` environment variable is correct
3. Session expiry is properly configured

### MFA QR Code Not Displaying

Check:
1. `qrcode` package is installed
2. Secret is being generated correctly
3. Browser allows image data URLs

### OAuth Redirect Not Working

Check:
1. Redirect URIs match in OAuth provider settings
2. `NEXT_PUBLIC_OAUTH_CALLBACK_URL` is correct
3. OAuth provider credentials are valid

### API Key Validation Failing

Check:
1. API key format is correct (starts with `sk_live_`)
2. API key hasn't expired
3. Rate limits haven't been exceeded
4. IP address is allowed (if whitelist is configured)

## Support

For issues and questions:
- Check the [documentation](./AUTH_FEATURES_README.md)
- Review security event logs for detailed error information
- Check Redis and database logs

## License

This authentication system is part of the Sterling CRM application.
