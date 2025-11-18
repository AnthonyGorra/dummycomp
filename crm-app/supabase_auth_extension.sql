-- =====================================================
-- AUTHENTICATION & AUTHORIZATION EXTENSION
-- =====================================================
-- This file extends the base schema with comprehensive
-- authentication and authorization features including:
-- - Role-Based Access Control (RBAC)
-- - Multi-Factor Authentication (MFA)
-- - API Key Management
-- - Session Management
-- - Account Security & Brute Force Protection
-- - OAuth 2.0 Integrations
-- - Audit Logging
-- =====================================================

-- =====================================================
-- 1. ROLE-BASED ACCESS CONTROL (RBAC)
-- =====================================================

-- System roles table
CREATE TABLE roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false, -- Prevents deletion of core roles
  level INTEGER NOT NULL DEFAULT 0, -- Hierarchy level (0=lowest, 100=highest)

  -- Role configuration
  is_active BOOLEAN DEFAULT true,
  max_users INTEGER, -- Optional limit on role assignments

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  color VARCHAR(20), -- For UI display
  icon VARCHAR(50) -- For UI display
);

-- Permissions table
CREATE TABLE permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  name VARCHAR(100) UNIQUE NOT NULL, -- e.g., "clients.create", "reports.export"
  resource VARCHAR(50) NOT NULL, -- e.g., "clients", "reports", "settings"
  action VARCHAR(50) NOT NULL, -- e.g., "create", "read", "update", "delete", "export"
  description TEXT,

  -- Permission configuration
  is_system_permission BOOLEAN DEFAULT false,
  category VARCHAR(50), -- For grouping in UI

  -- Constraints
  CONSTRAINT unique_resource_action UNIQUE(resource, action)
);

-- Role-Permission mapping
CREATE TABLE role_permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  role_id UUID REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE NOT NULL,

  -- Optional conditional grants
  conditions JSONB, -- e.g., {"field": "client_status", "value": "Active"}

  CONSTRAINT unique_role_permission UNIQUE(role_id, permission_id)
);

-- User-Role assignments
CREATE TABLE user_roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE NOT NULL,

  -- Assignment metadata
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  -- Optional expiration
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,

  -- Context-specific roles (e.g., role only applies to specific clients)
  scope JSONB, -- e.g., {"client_ids": ["uuid1", "uuid2"]}

  CONSTRAINT unique_user_role UNIQUE(user_id, role_id)
);

-- User profile extensions
CREATE TABLE user_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Profile information
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  display_name VARCHAR(200),
  avatar_url TEXT,
  bio TEXT,

  -- Contact information
  phone VARCHAR(50),
  mobile VARCHAR(50),
  timezone VARCHAR(50) DEFAULT 'Australia/Sydney',
  locale VARCHAR(10) DEFAULT 'en-AU',

  -- Professional information
  job_title VARCHAR(100),
  department VARCHAR(100),
  employee_id VARCHAR(50),

  -- Account status
  account_status VARCHAR(20) CHECK (account_status IN ('Active', 'Inactive', 'Suspended', 'Locked')) DEFAULT 'Active',

  -- Preferences
  preferences JSONB DEFAULT '{}',
  notification_settings JSONB DEFAULT '{}',

  -- Timestamps
  last_active_at TIMESTAMP WITH TIME ZONE,
  email_verified_at TIMESTAMP WITH TIME ZONE,
  phone_verified_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- 2. MULTI-FACTOR AUTHENTICATION (MFA)
-- =====================================================

-- MFA secrets and configuration
CREATE TABLE user_mfa_secrets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- TOTP configuration
  totp_secret VARCHAR(255), -- Encrypted TOTP secret
  totp_enabled BOOLEAN DEFAULT false,
  totp_verified_at TIMESTAMP WITH TIME ZONE,

  -- SMS configuration
  sms_phone VARCHAR(50), -- Verified phone for SMS
  sms_enabled BOOLEAN DEFAULT false,
  sms_verified_at TIMESTAMP WITH TIME ZONE,

  -- MFA enforcement
  mfa_required BOOLEAN DEFAULT false, -- Admin can enforce MFA
  mfa_required_since TIMESTAMP WITH TIME ZONE,

  -- Recovery
  recovery_codes_generated_at TIMESTAMP WITH TIME ZONE,
  recovery_codes_count INTEGER DEFAULT 0,

  -- Last usage
  last_totp_used_at TIMESTAMP WITH TIME ZONE,
  last_sms_used_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT unique_user_mfa UNIQUE(user_id)
);

-- MFA backup/recovery codes
CREATE TABLE mfa_backup_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code_hash VARCHAR(255) NOT NULL, -- Hashed backup code

  used_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN DEFAULT false
);

-- MFA verification attempts
CREATE TABLE mfa_verification_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mfa_type VARCHAR(20) CHECK (mfa_type IN ('totp', 'sms', 'backup_code')) NOT NULL,

  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,

  -- Rate limiting
  attempt_count INTEGER DEFAULT 1
);

-- =====================================================
-- 3. SESSION MANAGEMENT
-- =====================================================

-- User sessions (Redis-backed, with DB persistence)
CREATE TABLE user_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_token VARCHAR(255) UNIQUE NOT NULL,

  -- Session metadata
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50), -- "Desktop", "Mobile", "Tablet"
  device_name VARCHAR(100),
  browser VARCHAR(50),
  os VARCHAR(50),
  location JSONB, -- Geo-location data

  -- Session status
  is_active BOOLEAN DEFAULT true,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Security
  mfa_verified BOOLEAN DEFAULT false,
  mfa_verified_at TIMESTAMP WITH TIME ZONE,

  -- Revocation
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES auth.users(id),
  revoke_reason VARCHAR(100)
);

-- Session activity log
CREATE TABLE session_activity (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  activity_type VARCHAR(50) NOT NULL, -- "page_view", "api_call", "action"
  resource VARCHAR(100),
  action VARCHAR(50),

  ip_address INET,
  user_agent TEXT,

  -- Performance tracking
  response_time_ms INTEGER
);

-- =====================================================
-- 4. ACCOUNT SECURITY & BRUTE FORCE PROTECTION
-- =====================================================

-- Login attempts tracking
CREATE TABLE login_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  -- User identification (email or user_id if known)
  email VARCHAR(255),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Attempt details
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(100), -- "invalid_credentials", "account_locked", "mfa_required", "mfa_failed"

  -- Request metadata
  ip_address INET NOT NULL,
  user_agent TEXT,

  -- Geo-location
  country VARCHAR(2),
  city VARCHAR(100),

  -- Rate limiting window
  attempt_window TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Account lockouts
CREATE TABLE account_lockouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Lockout status
  is_locked BOOLEAN DEFAULT true,
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  locked_until TIMESTAMP WITH TIME ZONE, -- NULL = manual unlock required

  -- Lockout reason
  lockout_reason VARCHAR(50) CHECK (lockout_reason IN ('brute_force', 'suspicious_activity', 'manual', 'policy_violation', 'compromised')) NOT NULL,
  failed_attempts_count INTEGER DEFAULT 0,

  -- Resolution
  unlocked_at TIMESTAMP WITH TIME ZONE,
  unlocked_by UUID REFERENCES auth.users(id),
  unlock_method VARCHAR(50), -- "auto_expiry", "admin", "password_reset"

  -- Additional context
  triggering_ip INET,
  notes TEXT
);

-- Security events log
CREATE TABLE security_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  event_type VARCHAR(50) NOT NULL, -- "password_change", "mfa_enabled", "mfa_disabled", "suspicious_login", "api_key_created"
  severity VARCHAR(20) CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Low',

  description TEXT,
  metadata JSONB,

  -- Request context
  ip_address INET,
  user_agent TEXT,

  -- Response/action taken
  action_taken VARCHAR(100),

  -- Investigation
  investigated BOOLEAN DEFAULT false,
  investigated_by UUID REFERENCES auth.users(id),
  investigated_at TIMESTAMP WITH TIME ZONE,
  resolution TEXT
);

-- =====================================================
-- 5. API KEY MANAGEMENT
-- =====================================================

-- API keys for programmatic access
CREATE TABLE api_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Key identification
  name VARCHAR(100) NOT NULL,
  description TEXT,
  key_prefix VARCHAR(20) NOT NULL, -- First 8 chars for identification (e.g., "sk_live_")
  key_hash VARCHAR(255) NOT NULL, -- Hashed API key

  -- Key status
  is_active BOOLEAN DEFAULT true,

  -- Permissions (scoped)
  scopes JSONB DEFAULT '[]', -- ["clients:read", "clients:write", "reports:read"]
  role_id UUID REFERENCES roles(id), -- Optional: inherit permissions from role

  -- Usage limits
  rate_limit_per_hour INTEGER DEFAULT 1000,
  rate_limit_per_day INTEGER DEFAULT 10000,

  -- Usage tracking
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count BIGINT DEFAULT 0,

  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Revocation
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES auth.users(id),
  revoke_reason TEXT,

  -- IP restrictions
  allowed_ips JSONB, -- Array of CIDR ranges

  -- Webhook integration
  webhook_url TEXT,
  webhook_events JSONB DEFAULT '[]'
);

-- API key usage logs
CREATE TABLE api_key_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Request details
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,

  -- Response
  status_code INTEGER,
  response_time_ms INTEGER,

  -- Request metadata
  ip_address INET,
  user_agent TEXT,

  -- Rate limiting
  rate_limit_remaining INTEGER,
  rate_limit_reset_at TIMESTAMP WITH TIME ZONE,

  -- Error tracking
  error_message TEXT,

  -- Usage window for rate limiting
  usage_window TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- =====================================================
-- 6. OAUTH 2.0 PROVIDER INTEGRATIONS
-- =====================================================

-- OAuth provider configurations
CREATE TABLE oauth_providers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  provider_name VARCHAR(50) UNIQUE NOT NULL, -- "google", "microsoft", "linkedin"
  display_name VARCHAR(100) NOT NULL,

  -- OAuth configuration
  client_id VARCHAR(255) NOT NULL,
  client_secret VARCHAR(255) NOT NULL, -- Encrypted

  authorization_url TEXT NOT NULL,
  token_url TEXT NOT NULL,
  userinfo_url TEXT,

  scopes TEXT[] DEFAULT '{}', -- Default scopes to request

  -- Provider status
  is_enabled BOOLEAN DEFAULT true,

  -- UI configuration
  icon_url TEXT,
  button_color VARCHAR(20),

  -- Metadata
  provider_metadata JSONB DEFAULT '{}'
);

-- User OAuth connections
CREATE TABLE oauth_connections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES oauth_providers(id) ON DELETE CASCADE NOT NULL,

  -- OAuth data
  provider_user_id VARCHAR(255) NOT NULL, -- ID from OAuth provider
  provider_email VARCHAR(255),
  provider_username VARCHAR(255),

  -- Tokens (encrypted)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,

  -- Scopes granted
  scopes TEXT[] DEFAULT '{}',

  -- Profile data from provider
  profile_data JSONB,

  -- Connection status
  is_active BOOLEAN DEFAULT true,
  last_authenticated_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  connection_metadata JSONB DEFAULT '{}',

  CONSTRAINT unique_user_provider UNIQUE(user_id, provider_id),
  CONSTRAINT unique_provider_user UNIQUE(provider_id, provider_user_id)
);

-- OAuth authorization codes (temporary)
CREATE TABLE oauth_authorization_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  code VARCHAR(255) UNIQUE NOT NULL,
  provider_id UUID REFERENCES oauth_providers(id) ON DELETE CASCADE NOT NULL,

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- OAuth flow data
  redirect_uri TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  state VARCHAR(255),

  -- Code status
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- =====================================================
-- 7. AUDIT LOGGING
-- =====================================================

-- Comprehensive audit log
CREATE TABLE audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  -- Actor (who did the action)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,

  -- Action details
  action VARCHAR(100) NOT NULL, -- "create", "update", "delete", "login", "logout"
  resource_type VARCHAR(50) NOT NULL, -- "client", "user", "role", "permission"
  resource_id UUID,

  -- Change tracking
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],

  -- Request context
  ip_address INET,
  user_agent TEXT,

  -- Additional metadata
  description TEXT,
  severity VARCHAR(20) CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Low',

  -- Categorization
  category VARCHAR(50), -- "authentication", "authorization", "data_change", "security"

  -- Retention
  retention_days INTEGER DEFAULT 365
);

-- =====================================================
-- 8. INDEXES
-- =====================================================

-- RBAC indexes
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_active ON roles(is_active);
CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_action ON permissions(action);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_user_roles_active ON user_roles(is_active) WHERE is_active = true;
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_account_status ON user_profiles(account_status);

-- MFA indexes
CREATE INDEX idx_user_mfa_secrets_user_id ON user_mfa_secrets(user_id);
CREATE INDEX idx_mfa_backup_codes_user_id ON mfa_backup_codes(user_id);
CREATE INDEX idx_mfa_backup_codes_unused ON mfa_backup_codes(user_id) WHERE is_used = false;
CREATE INDEX idx_mfa_verification_attempts_user_id ON mfa_verification_attempts(user_id);
CREATE INDEX idx_mfa_verification_attempts_created_at ON mfa_verification_attempts(created_at);

-- Session indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_session_activity_session_id ON session_activity(session_id);
CREATE INDEX idx_session_activity_user_id ON session_activity(user_id);
CREATE INDEX idx_session_activity_created_at ON session_activity(created_at);

-- Security indexes
CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_user_id ON login_attempts(user_id);
CREATE INDEX idx_login_attempts_ip_address ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_created_at ON login_attempts(created_at);
CREATE INDEX idx_account_lockouts_user_id ON account_lockouts(user_id);
CREATE INDEX idx_account_lockouts_locked ON account_lockouts(is_locked) WHERE is_locked = true;
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_created_at ON security_events(created_at);

-- API key indexes
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);
CREATE INDEX idx_api_key_usage_api_key_id ON api_key_usage(api_key_id);
CREATE INDEX idx_api_key_usage_user_id ON api_key_usage(user_id);
CREATE INDEX idx_api_key_usage_created_at ON api_key_usage(created_at);

-- OAuth indexes
CREATE INDEX idx_oauth_providers_name ON oauth_providers(provider_name);
CREATE INDEX idx_oauth_providers_enabled ON oauth_providers(is_enabled);
CREATE INDEX idx_oauth_connections_user_id ON oauth_connections(user_id);
CREATE INDEX idx_oauth_connections_provider_id ON oauth_connections(provider_id);
CREATE INDEX idx_oauth_connections_active ON oauth_connections(is_active);
CREATE INDEX idx_oauth_authorization_codes_code ON oauth_authorization_codes(code);
CREATE INDEX idx_oauth_authorization_codes_expires_at ON oauth_authorization_codes(expires_at);

-- Audit log indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_category ON audit_logs(category);

-- =====================================================
-- 9. TRIGGERS
-- =====================================================

-- Updated_at triggers for all new tables
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_mfa_secrets_updated_at BEFORE UPDATE ON user_mfa_secrets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_lockouts_updated_at BEFORE UPDATE ON account_lockouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_providers_updated_at BEFORE UPDATE ON oauth_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_connections_updated_at BEFORE UPDATE ON oauth_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mfa_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_backup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_verification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (true);

-- MFA policies
CREATE POLICY "Users can view their own MFA settings" ON user_mfa_secrets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own MFA settings" ON user_mfa_secrets
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own backup codes" ON mfa_backup_codes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage backup codes" ON mfa_backup_codes
  FOR ALL USING (true);

-- Session policies
CREATE POLICY "Users can view their own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions" ON user_sessions
  FOR ALL USING (auth.uid() = user_id);

-- API key policies
CREATE POLICY "Users can view their own API keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own API keys" ON api_keys
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own API usage" ON api_key_usage
  FOR SELECT USING (auth.uid() = user_id);

-- OAuth policies
CREATE POLICY "Everyone can view enabled OAuth providers" ON oauth_providers
  FOR SELECT USING (is_enabled = true);

CREATE POLICY "Users can view their own OAuth connections" ON oauth_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own OAuth connections" ON oauth_connections
  FOR ALL USING (auth.uid() = user_id);

-- Audit log policies
CREATE POLICY "Users can view their own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Security event policies
CREATE POLICY "Users can view their own security events" ON security_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert security events" ON security_events
  FOR INSERT WITH CHECK (true);

-- Role and permission policies (admin-only, relaxed for now)
CREATE POLICY "Users can view roles" ON roles
  FOR SELECT USING (true);

CREATE POLICY "Users can view permissions" ON permissions
  FOR SELECT USING (true);

CREATE POLICY "Users can view role permissions" ON role_permissions
  FOR SELECT USING (true);

CREATE POLICY "Users can view user roles" ON user_roles
  FOR SELECT USING (true);

-- =====================================================
-- 11. DEFAULT DATA
-- =====================================================

-- Insert default system roles
INSERT INTO roles (name, display_name, description, is_system_role, level) VALUES
  ('super_admin', 'Super Administrator', 'Full system access with all permissions', true, 100),
  ('admin', 'Administrator', 'Administrative access to manage users and settings', true, 90),
  ('manager', 'Manager', 'Can manage clients and view reports', true, 70),
  ('adviser', 'Financial Adviser', 'Standard adviser access to clients and portfolios', true, 50),
  ('junior_adviser', 'Junior Adviser', 'Limited adviser access', true, 30),
  ('readonly', 'Read Only', 'View-only access to data', true, 10);

-- Insert default permissions
INSERT INTO permissions (name, resource, action, category, is_system_permission) VALUES
  -- Client permissions
  ('clients.create', 'clients', 'create', 'Clients', true),
  ('clients.read', 'clients', 'read', 'Clients', true),
  ('clients.update', 'clients', 'update', 'Clients', true),
  ('clients.delete', 'clients', 'delete', 'Clients', true),
  ('clients.export', 'clients', 'export', 'Clients', true),

  -- Portfolio permissions
  ('portfolios.read', 'portfolios', 'read', 'Portfolios', true),
  ('portfolios.update', 'portfolios', 'update', 'Portfolios', true),
  ('portfolios.trade', 'portfolios', 'trade', 'Portfolios', true),

  -- Report permissions
  ('reports.read', 'reports', 'read', 'Reports', true),
  ('reports.create', 'reports', 'create', 'Reports', true),
  ('reports.export', 'reports', 'export', 'Reports', true),

  -- Document permissions
  ('documents.read', 'documents', 'read', 'Documents', true),
  ('documents.create', 'documents', 'create', 'Documents', true),
  ('documents.delete', 'documents', 'delete', 'Documents', true),

  -- Workflow permissions
  ('workflows.read', 'workflows', 'read', 'Workflows', true),
  ('workflows.create', 'workflows', 'create', 'Workflows', true),
  ('workflows.execute', 'workflows', 'execute', 'Workflows', true),

  -- User management permissions
  ('users.read', 'users', 'read', 'Users', true),
  ('users.create', 'users', 'create', 'Users', true),
  ('users.update', 'users', 'update', 'Users', true),
  ('users.delete', 'users', 'delete', 'Users', true),

  -- Role management permissions
  ('roles.read', 'roles', 'read', 'Roles', true),
  ('roles.create', 'roles', 'create', 'Roles', true),
  ('roles.update', 'roles', 'update', 'Roles', true),
  ('roles.delete', 'roles', 'delete', 'Roles', true),

  -- Settings permissions
  ('settings.read', 'settings', 'read', 'Settings', true),
  ('settings.update', 'settings', 'update', 'Settings', true),

  -- Audit log permissions
  ('audit.read', 'audit', 'read', 'Audit', true),

  -- API key permissions
  ('api_keys.read', 'api_keys', 'read', 'API Keys', true),
  ('api_keys.create', 'api_keys', 'create', 'API Keys', true),
  ('api_keys.delete', 'api_keys', 'delete', 'API Keys', true);

-- Assign permissions to super_admin role (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
  SELECT
    (SELECT id FROM roles WHERE name = 'super_admin'),
    id
  FROM permissions;

-- Assign permissions to admin role (most permissions except role management)
INSERT INTO role_permissions (role_id, permission_id)
  SELECT
    (SELECT id FROM roles WHERE name = 'admin'),
    id
  FROM permissions
  WHERE name NOT IN ('roles.create', 'roles.update', 'roles.delete');

-- Assign permissions to adviser role
INSERT INTO role_permissions (role_id, permission_id)
  SELECT
    (SELECT id FROM roles WHERE name = 'adviser'),
    id
  FROM permissions
  WHERE name IN (
    'clients.create', 'clients.read', 'clients.update', 'clients.export',
    'portfolios.read', 'portfolios.update', 'portfolios.trade',
    'reports.read', 'reports.create', 'reports.export',
    'documents.read', 'documents.create',
    'workflows.read', 'workflows.execute',
    'api_keys.read', 'api_keys.create'
  );

-- Assign permissions to readonly role
INSERT INTO role_permissions (role_id, permission_id)
  SELECT
    (SELECT id FROM roles WHERE name = 'readonly'),
    id
  FROM permissions
  WHERE action = 'read';

-- Insert default OAuth providers (disabled by default, requires configuration)
INSERT INTO oauth_providers (
  provider_name,
  display_name,
  client_id,
  client_secret,
  authorization_url,
  token_url,
  userinfo_url,
  scopes,
  is_enabled,
  icon_url
) VALUES
  (
    'google',
    'Google',
    'YOUR_GOOGLE_CLIENT_ID',
    'YOUR_GOOGLE_CLIENT_SECRET',
    'https://accounts.google.com/o/oauth2/v2/auth',
    'https://oauth2.googleapis.com/token',
    'https://www.googleapis.com/oauth2/v2/userinfo',
    ARRAY['openid', 'email', 'profile'],
    false,
    'https://www.google.com/favicon.ico'
  ),
  (
    'microsoft',
    'Microsoft',
    'YOUR_MICROSOFT_CLIENT_ID',
    'YOUR_MICROSOFT_CLIENT_SECRET',
    'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    'https://graph.microsoft.com/v1.0/me',
    ARRAY['openid', 'email', 'profile'],
    false,
    'https://www.microsoft.com/favicon.ico'
  ),
  (
    'linkedin',
    'LinkedIn',
    'YOUR_LINKEDIN_CLIENT_ID',
    'YOUR_LINKEDIN_CLIENT_SECRET',
    'https://www.linkedin.com/oauth/v2/authorization',
    'https://www.linkedin.com/oauth/v2/accessToken',
    'https://api.linkedin.com/v2/me',
    ARRAY['r_liteprofile', 'r_emailaddress'],
    false,
    'https://www.linkedin.com/favicon.ico'
  );

-- =====================================================
-- 12. HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_permission_name VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      AND p.name = p_permission_name
  ) INTO has_perm;

  RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE(permission_name VARCHAR, resource VARCHAR, action VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.name, p.resource, p.action
  FROM user_roles ur
  JOIN role_permissions rp ON rp.role_id = ur.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = p_user_id
    AND ur.is_active = true
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log audit event
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_action VARCHAR,
  p_resource_type VARCHAR,
  p_resource_id UUID,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_severity VARCHAR DEFAULT 'Low',
  p_category VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    description,
    severity,
    category
  ) VALUES (
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values,
    p_description,
    p_severity,
    p_category
  ) RETURNING id INTO audit_id;

  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check account lockout
CREATE OR REPLACE FUNCTION is_account_locked(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_locked BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM account_lockouts
    WHERE user_id = p_user_id
      AND is_locked = true
      AND (locked_until IS NULL OR locked_until > NOW())
  ) INTO is_locked;

  RETURN is_locked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record login attempt
CREATE OR REPLACE FUNCTION record_login_attempt(
  p_email VARCHAR,
  p_user_id UUID,
  p_success BOOLEAN,
  p_failure_reason VARCHAR DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO login_attempts (
    email,
    user_id,
    success,
    failure_reason,
    ip_address
  ) VALUES (
    p_email,
    p_user_id,
    p_success,
    p_failure_reason,
    p_ip_address
  );

  -- Check for brute force attempts (5 failed attempts in 15 minutes)
  IF NOT p_success THEN
    DECLARE
      failed_count INTEGER;
    BEGIN
      SELECT COUNT(*)
      INTO failed_count
      FROM login_attempts
      WHERE (email = p_email OR user_id = p_user_id)
        AND success = false
        AND created_at > NOW() - INTERVAL '15 minutes';

      -- Lock account if threshold exceeded
      IF failed_count >= 5 AND p_user_id IS NOT NULL THEN
        INSERT INTO account_lockouts (
          user_id,
          lockout_reason,
          failed_attempts_count,
          locked_until,
          triggering_ip
        ) VALUES (
          p_user_id,
          'brute_force',
          failed_count,
          NOW() + INTERVAL '30 minutes',
          p_ip_address
        )
        ON CONFLICT (user_id) DO UPDATE
        SET
          is_locked = true,
          locked_at = NOW(),
          locked_until = NOW() + INTERVAL '30 minutes',
          failed_attempts_count = failed_count,
          triggering_ip = p_ip_address;
      END IF;
    END;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- END OF AUTHENTICATION & AUTHORIZATION EXTENSION
-- =====================================================
