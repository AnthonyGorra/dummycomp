# SSL/TLS Certificate Automation

This directory contains the configuration for automated SSL/TLS certificate management using Let's Encrypt and Certbot.

## Features

- **Automated Certificate Issuance**: Automatically obtain SSL/TLS certificates from Let's Encrypt
- **Auto-Renewal**: Certificates automatically renew before expiration
- **Nginx Reverse Proxy**: Production-grade reverse proxy with SSL termination
- **Security Best Practices**: Modern TLS configuration with strong ciphers
- **Rate Limiting**: Built-in DDoS protection at the Nginx level

## Prerequisites

- Docker and Docker Compose
- A registered domain name pointing to your server
- Ports 80 and 443 open on your firewall

## Quick Start

### 1. Configure Your Domain

Edit `ssl/nginx/conf.d/app.conf` and replace `YOUR_DOMAIN.com` with your actual domain:

```bash
# Replace all instances of YOUR_DOMAIN.com
sed -i 's/YOUR_DOMAIN.com/yourdomain.com/g' ssl/nginx/conf.d/app.conf
```

### 2. Update Email in Init Script

Edit `ssl/scripts/init-letsencrypt.sh` and set your email:

```bash
EMAIL="admin@yourdomain.com"
```

### 3. Run Initial Setup

```bash
cd infrastructure/ssl
chmod +x scripts/*.sh
./scripts/init-letsencrypt.sh
```

The script will:
- Create necessary directories
- Download recommended TLS parameters
- Create a dummy certificate
- Start Nginx
- Request a real certificate from Let's Encrypt
- Configure auto-renewal

### 4. Switch to Production Certificates

The initial setup uses Let's Encrypt staging server for testing. Once verified, switch to production:

```bash
# Edit init-letsencrypt.sh and change:
STAGING=0

# Run again
./scripts/init-letsencrypt.sh
```

## Certificate Management

### Check Certificate Status

```bash
./scripts/check-certs.sh
```

### Manual Renewal

Certificates auto-renew, but you can trigger manually:

```bash
./scripts/renew-certs.sh
```

### View Certificate Details

```bash
docker-compose -f docker-compose.ssl.yml run --rm certbot certificates
```

## Security Features

### TLS Configuration

- **Protocols**: TLS 1.2 and 1.3 only
- **Ciphers**: Modern, secure cipher suites
- **HSTS**: Strict-Transport-Security header with 1-year max-age
- **OCSP Stapling**: Enabled for faster certificate validation

### Security Headers

- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Content-Security-Policy: Strict policy
- Referrer-Policy: strict-origin-when-cross-origin

### Rate Limiting

- **General**: 10 requests/second
- **API**: 30 requests/minute
- **Auth**: 5 requests/minute
- **Connection limit**: 10 concurrent connections per IP

## Directory Structure

```
ssl/
├── certbot/
│   ├── conf/          # Certificate storage
│   ├── www/           # ACME challenge files
│   └── logs/          # Certbot logs
├── nginx/
│   ├── nginx.conf     # Main Nginx config
│   ├── ssl-params.conf # SSL/TLS parameters
│   └── conf.d/
│       └── app.conf   # Application server config
├── scripts/
│   ├── init-letsencrypt.sh  # Initial setup
│   ├── renew-certs.sh       # Manual renewal
│   └── check-certs.sh       # Certificate status
├── docker-compose.ssl.yml   # Docker Compose config
└── README.md
```

## Troubleshooting

### Certificate Request Failed

1. **Check DNS**: Ensure your domain points to your server
   ```bash
   dig +short yourdomain.com
   ```

2. **Check Firewall**: Ports 80 and 443 must be open
   ```bash
   sudo ufw status
   ```

3. **Check Logs**:
   ```bash
   docker-compose -f docker-compose.ssl.yml logs certbot
   ```

### Nginx Won't Start

1. **Test Configuration**:
   ```bash
   docker-compose -f docker-compose.ssl.yml exec nginx nginx -t
   ```

2. **Check Logs**:
   ```bash
   docker-compose -f docker-compose.ssl.yml logs nginx
   ```

### Rate Limit Hit

Let's Encrypt has rate limits:
- 50 certificates per registered domain per week
- 5 failed validation attempts per hour

Use staging mode for testing to avoid hitting limits.

## Maintenance

### Automatic Renewal

The certbot container runs every 12 hours and checks for certificates expiring within 30 days. No manual intervention needed.

### Monitoring

Add to your monitoring system:

```bash
# Check certificate expiry
openssl x509 -in ./ssl/certbot/conf/live/yourdomain.com/fullchain.pem -noout -checkend 604800

# Exit code 0 = valid for 7+ days
# Exit code 1 = expires within 7 days
```

## Production Checklist

- [ ] Domain DNS configured and propagated
- [ ] Email address configured in init script
- [ ] STAGING=0 in init script (for production certificates)
- [ ] Firewall ports 80 and 443 open
- [ ] ADMIN_IP_WHITELIST configured in environment
- [ ] Monitoring set up for certificate expiration
- [ ] Backup strategy for certificate files

## Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://certbot.eff.org/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [SSL Server Test](https://www.ssllabs.com/ssltest/)
