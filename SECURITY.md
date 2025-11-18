# Security Documentation

This document provides a comprehensive overview of the security implementations in the CRM application.

## Table of Contents

1. [Overview](#overview)
2. [Network Security](#network-security)
3. [Application Security](#application-security)
4. [Database Security](#database-security)
5. [Authentication & Authorization](#authentication--authorization)
6. [Monitoring & Incident Response](#monitoring--incident-response)
7. [Compliance](#compliance)
8. [Security Checklist](#security-checklist)

## Overview

The CRM application implements defense-in-depth security with multiple layers:

- **Network Layer**: IP whitelisting, VPN, DDoS protection, network segmentation
- **Transport Layer**: SSL/TLS encryption, certificate automation
- **Application Layer**: Rate limiting, input validation, security headers
- **Data Layer**: Database isolation, encryption, access controls
- **Authentication**: Strong password policies, session management
- **Monitoring**: Logging, alerting, intrusion detection

## Network Security

### 1. IP Whitelisting

**Location**: `crm-app/lib/security/ip-whitelist.ts`

**Features**:
- IP address validation for admin routes
- CIDR range support (e.g., 192.168.1.0/24)
- IP range support (e.g., 192.168.1.1-192.168.1.255)
- IPv6 support
- Automatic localhost whitelisting in development

**Configuration**:
```bash
# Environment variable
ENABLE_IP_WHITELIST=true
ADMIN_IP_WHITELIST=1.2.3.4,5.6.7.0/24,10.8.0.0/24
```

**Protected Routes**:
- `/settings/*`
- `/admin/*`
- `/api/admin/*`

**Implementation**:
- Middleware integration in `crm-app/middleware.ts`
- Checks X-Forwarded-For, X-Real-IP, CF-Connecting-IP headers
- Returns 403 for unauthorized IPs
- Logs all blocked attempts

### 2. VPN Integration

**Location**: `infrastructure/vpn/`

**Supported VPN Solutions**:
1. **WireGuard** (Recommended)
   - Modern, fast, cryptographically sound
   - Easy to configure and manage
   - Location: `infrastructure/vpn/wireguard/`

2. **OpenVPN** (Alternative)
   - Industry standard
   - Wide client support
   - Location: `infrastructure/vpn/openvpn/`

**VPN Networks**:
- WireGuard: 10.8.0.0/24
- OpenVPN: 10.9.0.0/24

**Features**:
- Client management scripts
- Automated setup scripts
- Docker Compose deployment
- VPN connection validation at application level

**Setup**:
```bash
# WireGuard setup
cd infrastructure/vpn/wireguard
sudo ./setup.sh

# Add client
sudo ./add-client.sh
```

**Application Integration**:
- VPN validator: `crm-app/lib/security/vpn-validator.ts`
- Automatic VPN detection
- Optional VPN requirement for admin routes

**Configuration**:
```bash
REQUIRE_VPN=true  # Require VPN for admin routes in production
```

### 3. SSL/TLS Certificate Automation

**Location**: `infrastructure/ssl/`

**Features**:
- Let's Encrypt integration
- Automatic certificate issuance
- Auto-renewal every 12 hours
- Nginx reverse proxy with SSL termination
- Modern TLS configuration (TLS 1.2+)

**Setup**:
```bash
cd infrastructure/ssl
./scripts/init-letsencrypt.sh
```

**TLS Configuration**:
- Protocols: TLS 1.2, TLS 1.3
- Ciphers: Modern, secure cipher suites
- HSTS: Enabled with 1-year max-age
- OCSP Stapling: Enabled
- Perfect Forward Secrecy: Enabled

**Certificate Management**:
```bash
# Check status
./scripts/check-certs.sh

# Manual renewal
./scripts/renew-certs.sh
```

### 4. DDoS Protection

**Location**: `infrastructure/ddos-protection/`

**Multi-Layer Protection**:

**Layer 1: Cloudflare**
- Global CDN edge protection
- Automatic DDoS mitigation
- Bot detection and blocking
- Geographic filtering
- Rate limiting at edge

**Configuration**:
```bash
cd infrastructure/ddos-protection/cloudflare
./cloudflare-config.sh
```

**Layer 2: AWS Shield & WAF**
- AWS Shield Standard (included)
- AWS WAF with managed rule sets
- Custom rate limiting rules
- Geographic blocking
- IP reputation lists

**Deployment**:
```bash
cd infrastructure/ddos-protection/aws/terraform
terraform apply
```

**Layer 3: Application Level**
- Rate limiting middleware
- Connection limiting
- Request size limits

**Rate Limits**:
- General: 10 req/s
- API: 30 req/min
- Auth: 5 req/min (15 min window)
- Admin: 100 req/15min

### 5. Network Segmentation

**Location**: `infrastructure/network-segmentation/`

**Architecture**:
```
Internet → Public Network → App Network → Database Network
                                ↓
                          VPN Network (Admin)
```

**Network Layers**:

1. **Public Network** (172.20.0.0/16)
   - Nginx reverse proxy
   - Internet-accessible
   - SSL termination

2. **Application Network** (172.21.0.0/16)
   - CRM application
   - Private network
   - Outbound internet via NAT

3. **Database Network** (172.22.0.0/16)
   - PostgreSQL, Redis
   - **Completely isolated**
   - No internet access

4. **VPN Network** (172.23.0.0/16)
   - Bastion host
   - Admin access only
   - VPN required

**Docker Deployment**:
```bash
cd infrastructure/network-segmentation
docker-compose -f docker-compose.segmented.yml up -d
```

**AWS Deployment**:
- VPC with 3-tier architecture
- Security groups for each layer
- VPC Flow Logs
- NAT Gateways for app subnet
- No internet gateway for database subnet

## Application Security

### 1. Rate Limiting

**Implementation**: `crm-app/lib/security/rate-limiter.ts`

**Features**:
- Per-IP rate limiting
- Different limits per endpoint type
- Sliding window algorithm
- Automatic cleanup of expired entries
- 429 responses with Retry-After header

**Configuration**:
```bash
# API endpoints
API_RATE_LIMIT_WINDOW=60000      # 1 minute
API_RATE_LIMIT_MAX=100           # 100 requests

# Auth endpoints
AUTH_RATE_LIMIT_WINDOW=900000    # 15 minutes
AUTH_RATE_LIMIT_MAX=5            # 5 requests

# Admin endpoints
ADMIN_RATE_LIMIT_WINDOW=900000   # 15 minutes
ADMIN_RATE_LIMIT_MAX=100         # 100 requests
```

### 2. Security Headers

**Implementation**: `crm-app/middleware.ts`

**Headers**:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: [Strict policy]
```

### 3. Input Validation

**Implementation**: Throughout application

**Validation**:
- Zod schema validation
- Type checking (TypeScript)
- Sanitization of user inputs
- SQL injection prevention (parameterized queries)
- XSS prevention (escaped outputs)

### 4. Webhook Security

**Implementation**: `crm-app/lib/webhooks/security.ts`

**Features**:
- HMAC-SHA256 signature verification
- API key validation (timing-safe)
- Timestamp verification (replay protection)
- Request logging
- 5-minute timestamp tolerance

## Database Security

### 1. PostgreSQL Hardening

**Configuration**: `infrastructure/network-segmentation/database/postgresql.conf`

**Security Features**:
- SSL/TLS required
- TLS 1.2 minimum
- Strong cipher suites
- SCRAM-SHA-256 password encryption
- Connection logging
- Query logging (slow queries)
- Row-Level Security (RLS)

### 2. Access Control

**Configuration**: `infrastructure/network-segmentation/database/pg_hba.conf`

**Access Rules**:
- Application network: SCRAM-SHA-256 auth
- Bastion host: SCRAM-SHA-256 auth
- All others: REJECT

### 3. Network Isolation

- Database on isolated network
- No internet access
- Only accessible from app network and bastion
- Security group restrictions (AWS)

### 4. Backups

**Implementation**: `infrastructure/network-segmentation/scripts/backup.sh`

**Features**:
- Daily automated backups
- 7-day retention
- Encrypted backups
- Runs in isolated network
- Backup verification

## Authentication & Authorization

### 1. Supabase Auth

**Features**:
- Email/password authentication
- Magic link authentication
- OAuth providers
- JWT-based sessions
- Row-Level Security integration

### 2. Session Management

**Security**:
- HTTP-only cookies
- Secure flag in production
- SameSite=Strict
- Session timeout
- Automatic session refresh

### 3. Row-Level Security (RLS)

**Implementation**: `crm-app/supabase_schema.sql`

**Policies**:
- User can only access their own data
- Policies on all tables
- Enforced at database level
- No bypassing via application

## Monitoring & Incident Response

### 1. Logging

**Application Logs**:
- All authentication attempts
- Failed authorization
- Rate limit violations
- IP whitelist violations
- Webhook events

**Infrastructure Logs**:
- VPC Flow Logs (AWS)
- WAF logs (AWS)
- Nginx access logs
- Database query logs

### 2. Monitoring

**Metrics**:
- Request rates
- Error rates
- Response times
- DDoS events
- Certificate expiration

**Tools**:
- CloudWatch (AWS)
- Cloudflare Analytics
- Application health checks

### 3. Alerting

**Alerts**:
- DDoS attacks detected
- Certificate expiring soon
- High error rates
- Unauthorized access attempts
- Database connection failures

**Channels**:
- Email (SNS)
- Slack (optional)
- PagerDuty (optional)

### 4. Incident Response

**Procedure**:
1. Detect (automated alerts)
2. Assess (review logs)
3. Contain (block IPs, enable Under Attack Mode)
4. Eradicate (patch vulnerabilities)
5. Recover (restore from backups if needed)
6. Post-mortem (document lessons learned)

## Compliance

### Supported Standards

**PCI DSS**:
- Network segmentation ✓
- Encryption in transit ✓
- Access controls ✓
- Logging and monitoring ✓

**HIPAA**:
- Data encryption ✓
- Access controls ✓
- Audit logging ✓
- Network isolation ✓

**SOC 2**:
- Security controls ✓
- Monitoring ✓
- Incident response ✓
- Access management ✓

**GDPR**:
- Data protection by design ✓
- Encryption ✓
- Access controls ✓
- Audit trails ✓

### Regular Audits

**Monthly**:
- Review access logs
- Update security groups
- Check certificate expiration
- Review rate limits
- Test backup restoration

**Quarterly**:
- Penetration testing
- Security assessment
- Update dependencies
- Review incident logs

**Annually**:
- Full security audit
- Compliance certification
- Disaster recovery test
- Update security documentation

## Security Checklist

### Deployment

- [ ] SSL/TLS certificates installed
- [ ] HSTS enabled
- [ ] IP whitelist configured
- [ ] VPN set up and tested
- [ ] DDoS protection active
- [ ] Network segmentation verified
- [ ] Database isolated
- [ ] Backups automated
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Security headers enabled
- [ ] Rate limiting active
- [ ] WAF rules deployed
- [ ] VPC Flow Logs enabled
- [ ] RLS policies active

### Ongoing

- [ ] Review logs weekly
- [ ] Update dependencies monthly
- [ ] Rotate credentials quarterly
- [ ] Test backups monthly
- [ ] Penetration test quarterly
- [ ] Security audit annually
- [ ] Update documentation as needed

### Incident Response

- [ ] Incident response plan documented
- [ ] Team roles defined
- [ ] Contact information current
- [ ] Escalation procedures clear
- [ ] Communication templates ready
- [ ] Backup restoration tested
- [ ] Rollback procedures documented

## Security Contacts

**Security Issues**: security@yourdomain.com
**Emergency Contact**: +1-XXX-XXX-XXXX
**Incident Response Team**: incident@yourdomain.com

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CIS Security Benchmarks](https://www.cisecurity.org/cis-benchmarks/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [AWS Security Best Practices](https://aws.amazon.com/security/best-practices/)
- [Cloudflare Security Resources](https://www.cloudflare.com/learning/security/)

## Version History

- v1.0 (2024-01-18): Initial security implementation
  - IP whitelisting
  - VPN integration
  - SSL/TLS automation
  - DDoS protection
  - Network segmentation

---

**Last Updated**: 2024-01-18
**Reviewed By**: Security Team
**Next Review**: 2024-04-18
