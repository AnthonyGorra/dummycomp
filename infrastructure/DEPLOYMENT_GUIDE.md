# Network Security Deployment Guide

This guide provides step-by-step instructions for deploying all network security features.

## Prerequisites

- Server with Ubuntu 20.04+ or similar Linux distribution
- Docker and Docker Compose installed
- Domain name pointing to your server
- Ports 80, 443, 51820 (VPN) open in firewall
- Root or sudo access
- AWS account (for AWS Shield/WAF - optional)
- Cloudflare account (for DDoS protection - optional)

## Quick Start

For a rapid production deployment:

```bash
# 1. Clone repository
git clone https://github.com/yourusername/crm-app.git
cd crm-app

# 2. Configure environment
cp crm-app/.env.example crm-app/.env
# Edit .env with your configuration
nano crm-app/.env

# 3. Deploy with network segmentation and SSL
cd infrastructure
./scripts/deploy-production.sh
```

## Detailed Deployment

### Step 1: Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Configure firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 51820/udp # WireGuard VPN
sudo ufw enable
```

### Step 2: Configure Environment Variables

```bash
cd crm-app
cp .env.example .env
nano .env
```

**Required configurations**:

```bash
# Database
DB_PASSWORD=<generate-strong-password>
REDIS_PASSWORD=<generate-strong-password>

# Application
NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>

# Security
ENABLE_IP_WHITELIST=true
ADMIN_IP_WHITELIST=10.8.0.0/24,<your-office-ip>

# SSL
DOMAIN=yourdomain.com
SSL_EMAIL=admin@yourdomain.com
```

### Step 3: Set Up VPN

**Option A: WireGuard (Recommended)**

```bash
cd infrastructure/vpn/wireguard

# Install and configure WireGuard
sudo ./setup.sh

# Add admin client
sudo ./add-client.sh
# Enter client name: admin1

# Client configuration will be created at:
# /etc/wireguard/clients/admin1.conf

# Transfer configuration to admin securely (SCP, encrypted email, etc.)
```

**Option B: OpenVPN**

```bash
cd infrastructure/vpn/openvpn

# Initialize OpenVPN
docker-compose up -d

# Generate client configuration
docker-compose run --rm openvpn easyrsa build-client-full admin1 nopass
docker-compose run --rm openvpn ovpn_getclient admin1 > admin1.ovpn

# Transfer admin1.ovpn to admin securely
```

**Install VPN client on admin machines**:

- **WireGuard**: https://www.wireguard.com/install/
- **OpenVPN**: https://openvpn.net/client/

### Step 4: Deploy SSL/TLS Certificates

```bash
cd infrastructure/ssl

# Update domain in configuration
sed -i 's/YOUR_DOMAIN.com/yourdomain.com/g' nginx/conf.d/app.conf
sed -i 's/YOUR_DOMAIN.com/yourdomain.com/g' scripts/init-letsencrypt.sh

# Update email for Let's Encrypt
sed -i 's/admin@YOUR_DOMAIN.com/admin@yourdomain.com/g' scripts/init-letsencrypt.sh

# Make scripts executable
chmod +x scripts/*.sh

# Run Let's Encrypt setup (staging first for testing)
./scripts/init-letsencrypt.sh

# Verify certificate
./scripts/check-certs.sh

# If successful, switch to production
# Edit scripts/init-letsencrypt.sh: set STAGING=0
nano scripts/init-letsencrypt.sh  # Change STAGING=0
./scripts/init-letsencrypt.sh
```

### Step 5: Configure Network Segmentation

```bash
cd infrastructure/network-segmentation

# Update environment file
nano .env
# Set DB_PASSWORD, REDIS_PASSWORD, etc.

# Deploy with network segmentation
docker-compose -f docker-compose.segmented.yml up -d

# Verify network isolation
./scripts/test-network-segmentation.sh
```

### Step 6: Set Up DDoS Protection

**Option A: Cloudflare (Recommended for most users)**

1. **Add domain to Cloudflare**:
   - Go to https://dash.cloudflare.com
   - Add site
   - Follow DNS setup instructions

2. **Configure Cloudflare settings**:
   ```bash
   cd infrastructure/ddos-protection/cloudflare

   # Update configuration
   nano cloudflare-config.sh
   # Set CLOUDFLARE_EMAIL, CLOUDFLARE_API_KEY, CLOUDFLARE_ZONE_ID

   # Run configuration script
   chmod +x cloudflare-config.sh
   ./cloudflare-config.sh
   ```

3. **Deploy Cloudflare Worker** (optional, for advanced protection):
   ```bash
   npm install -g wrangler
   wrangler login

   # Update wrangler.toml with your details
   nano wrangler.toml

   # Deploy worker
   wrangler publish
   ```

**Option B: AWS Shield and WAF**

```bash
cd infrastructure/ddos-protection/aws/terraform

# Configure AWS credentials
aws configure

# Create terraform.tfvars
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars
# Update admin_ip_whitelist, blocked_countries, alert_email

# Deploy
terraform init
terraform plan
terraform apply

# Note the WAF ARN from output
# Associate with your ALB/CloudFront
```

### Step 7: Database Security Hardening

```bash
# Generate SSL certificates for PostgreSQL
cd infrastructure/network-segmentation/database

openssl req -new -x509 -days 365 -nodes -text \
  -out server.crt \
  -keyout server.key \
  -subj "/CN=database"

# Copy to container
docker cp server.crt crm-database:/var/lib/postgresql/
docker cp server.key crm-database:/var/lib/postgresql/
docker exec crm-database chmod 600 /var/lib/postgresql/server.key
docker exec crm-database chown postgres:postgres /var/lib/postgresql/server.*

# Restart database
docker-compose restart database

# Verify SSL is enabled
docker exec crm-database psql -U postgres -c "SHOW ssl;"
```

### Step 8: Configure Monitoring

```bash
# Set up log aggregation
cd infrastructure/monitoring

# Start log collection
docker-compose up -d

# Configure alerts
nano alerts.yml
# Update email, Slack webhook, etc.

# Test alerts
./scripts/test-alerts.sh
```

### Step 9: Verify Deployment

**Security Checklist**:

```bash
# 1. SSL/TLS
curl -I https://yourdomain.com
# Should return 200 with HSTS header

# 2. HTTP to HTTPS redirect
curl -I http://yourdomain.com
# Should return 301 redirect to HTTPS

# 3. IP whitelisting (without VPN)
curl -I https://yourdomain.com/settings
# Should return 403 if IP not whitelisted

# 4. Rate limiting
for i in {1..200}; do curl -s https://yourdomain.com/api/health; done
# Should start returning 429 after threshold

# 5. Database isolation
docker exec crm-database ping -c 3 8.8.8.8
# Should fail (Network unreachable)

# 6. Security headers
curl -I https://yourdomain.com | grep -i "x-frame-options\|x-content-type-options\|strict-transport-security"
# Should see all security headers
```

**Run security tests**:

```bash
cd infrastructure/scripts
./run-security-tests.sh
```

### Step 10: Backup Configuration

```bash
# Set up automated backups
cd infrastructure/network-segmentation

# Verify backup script
docker exec crm-db-backup cat /backup.sh

# Run manual backup test
docker exec crm-db-backup sh /backup.sh

# Verify backup created
docker exec crm-db-backup ls -lh /backup/

# Test restoration
docker exec -i crm-database psql -U $DB_USER -d template1 < /backup/backup_*.sql
```

## Post-Deployment

### 1. Test VPN Access

```bash
# From admin machine with VPN client:

# Connect to VPN
# WireGuard: Import config and activate
# OpenVPN: openvpn --config admin1.ovpn

# Verify VPN IP
curl ifconfig.me
# Should show VPN IP (10.8.0.x or 10.9.0.x)

# Access admin routes
curl -I https://yourdomain.com/settings
# Should return 200 (if IP whitelisting includes VPN range)
```

### 2. Monitor Application

```bash
# View application logs
docker-compose logs -f crm-app

# View security events
docker-compose logs crm-app | grep "Security"

# Check rate limiting
docker-compose logs crm-app | grep "Rate limit"

# View database connections
docker exec crm-database psql -U postgres -c "SELECT * FROM pg_stat_activity;"
```

### 3. Performance Testing

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test application performance
ab -n 1000 -c 10 https://yourdomain.com/

# Test with rate limiting
ab -n 500 -c 50 https://yourdomain.com/api/health
```

### 4. Security Scanning

```bash
# Install OWASP ZAP or similar
docker pull owasp/zap2docker-stable

# Run baseline scan
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://yourdomain.com

# SSL/TLS test
docker run --rm -ti drwetter/testssl.sh https://yourdomain.com
```

## Maintenance

### Daily

- Monitor security alerts
- Review access logs
- Check application health

### Weekly

- Review rate limit violations
- Check backup integrity
- Update security rules if needed

### Monthly

- Rotate credentials
- Review and update IP whitelist
- Test backup restoration
- Update dependencies
- Review VPN client list

### Quarterly

- Penetration testing
- Security audit
- Update SSL certificates (automatic, but verify)
- Review and update WAF rules

## Troubleshooting

### Cannot Access Admin Routes

**Problem**: 403 error on /settings

**Solutions**:
1. Verify VPN connection: `curl ifconfig.me` (should show VPN IP)
2. Check IP whitelist: `echo $ADMIN_IP_WHITELIST`
3. Review logs: `docker-compose logs crm-app | grep "IP"`
4. Temporarily disable: Set `ENABLE_IP_WHITELIST=false`

### Certificate Issues

**Problem**: SSL certificate not working

**Solutions**:
1. Check DNS: `dig +short yourdomain.com` (should show your server IP)
2. Review logs: `docker-compose logs certbot`
3. Verify port 80 open: `sudo netstat -tlnp | grep :80`
4. Manual renewal: `cd infrastructure/ssl && ./scripts/renew-certs.sh`

### Database Connection Failures

**Problem**: Cannot connect to database

**Solutions**:
1. Check network: `docker network inspect database_network`
2. Verify container running: `docker ps | grep database`
3. Check logs: `docker logs crm-database`
4. Test connection: `docker exec crm-app nc -zv database 5432`

### Rate Limit Issues

**Problem**: Legitimate users getting rate limited

**Solutions**:
1. Increase limits in .env
2. Whitelist specific IPs
3. Review logs to identify source: `docker logs crm-app | grep "Rate limit"`
4. Adjust time windows

## Rollback Procedures

### Rollback Application

```bash
# Stop current deployment
docker-compose down

# Restore from backup
docker-compose up -d database
docker exec -i crm-database psql -U $DB_USER -d $DB_NAME < /backup/backup_YYYYMMDD.sql

# Start previous version
git checkout <previous-commit>
docker-compose up -d
```

### Disable Security Features (Emergency)

```bash
# Disable IP whitelisting
echo "ENABLE_IP_WHITELIST=false" >> .env
docker-compose restart

# Disable VPN requirement
echo "REQUIRE_VPN=false" >> .env
docker-compose restart

# Temporarily disable rate limiting
# Edit middleware.ts and comment out rate limiting code
docker-compose restart
```

## Security Incident Response

### 1. Detect

- Monitor alerts (email, Slack, PagerDuty)
- Review logs regularly
- Use automated detection tools

### 2. Assess

```bash
# Review recent logs
docker-compose logs --since 1h crm-app

# Check for unauthorized access
docker exec crm-database psql -U postgres -c "SELECT * FROM auth.audit_log_entries ORDER BY created_at DESC LIMIT 100;"

# Review IP access patterns
docker-compose logs crm-app | grep "Unauthorized\|Blocked" | sort | uniq -c
```

### 3. Contain

```bash
# Block malicious IP
# Add to Cloudflare firewall rules or:
sudo ufw deny from <malicious-ip>

# Enable Cloudflare "Under Attack" mode
# Via dashboard or API

# Temporarily increase rate limits if needed
# Or decrease if under attack
```

### 4. Recover

```bash
# Restore from backup if needed
./infrastructure/network-segmentation/scripts/restore-backup.sh

# Update credentials
./scripts/rotate-credentials.sh

# Patch vulnerabilities
git pull origin main
docker-compose build --no-cache
docker-compose up -d
```

### 5. Document

- Create incident report
- Document timeline
- Identify root cause
- Update procedures
- Conduct post-mortem

## Support

- **Documentation**: See /infrastructure/*/README.md files
- **Security Issues**: security@yourdomain.com
- **Emergency**: +1-XXX-XXX-XXXX

## Additional Resources

- [Main Security Documentation](../SECURITY.md)
- [VPN Setup Guide](vpn/README.md)
- [SSL/TLS Guide](ssl/README.md)
- [DDoS Protection Guide](ddos-protection/README.md)
- [Network Segmentation Guide](network-segmentation/README.md)
