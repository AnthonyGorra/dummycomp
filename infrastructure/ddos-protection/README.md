# DDoS Protection Implementation

This directory contains configurations for comprehensive DDoS protection using both Cloudflare and AWS Shield/WAF.

## Overview

DDoS (Distributed Denial of Service) protection is implemented at multiple layers:

1. **Cloudflare** - Edge protection (DNS and Layer 7)
2. **AWS WAF** - Application firewall rules
3. **AWS Shield** - Network and transport layer protection
4. **Nginx** - Application-level rate limiting

## Cloudflare Protection

### Features

- **Global CDN**: Distributed edge network absorbs traffic
- **DDoS Mitigation**: Automatic detection and mitigation
- **Bot Protection**: AI-powered bot detection
- **Rate Limiting**: Per-endpoint rate limits
- **Geographic Filtering**: Block/allow by country
- **SSL/TLS**: Edge SSL termination

### Setup

1. **Point DNS to Cloudflare**:
   ```bash
   # Update nameservers to Cloudflare's
   # Cloudflare will provide nameservers after domain addition
   ```

2. **Deploy Cloudflare Worker**:
   ```bash
   cd cloudflare/
   npm install -g wrangler
   wrangler login

   # Update wrangler.toml with your account details
   # Deploy worker
   wrangler publish
   ```

3. **Configure Cloudflare Settings**:
   ```bash
   # Update credentials in cloudflare-config.sh
   vim cloudflare-config.sh

   # Run configuration script
   chmod +x cloudflare-config.sh
   ./cloudflare-config.sh
   ```

4. **Enable Additional Features** (via Dashboard):
   - Go to Security > WAF
   - Enable OWASP ModSecurity Core Rule Set
   - Configure custom firewall rules
   - Enable Bot Fight Mode
   - Set up Page Rules for caching

### Cloudflare Worker Configuration

The worker provides:
- IP-based rate limiting
- Bot score checking
- Geographic restrictions
- Security headers injection

Edit `cloudflare/worker.js` to customize:
- `RATE_LIMITS`: Adjust rate limits per endpoint
- `BLOCKED_COUNTRIES`: Block specific countries
- `ALLOWED_COUNTRIES`: Whitelist specific countries
- `IP_WHITELIST`: Bypass protection for trusted IPs

## AWS Shield and WAF

### AWS Shield Standard

- **Automatically enabled** for all AWS customers
- No additional cost
- Protection against common DDoS attacks
- Network and transport layer protection

### AWS Shield Advanced (Optional)

- **$3,000/month subscription**
- Enhanced DDoS protection
- 24/7 DDoS Response Team (DRT)
- Advanced attack analytics
- Cost protection for scaling during attacks

### AWS WAF Setup

1. **Install Terraform**:
   ```bash
   # macOS
   brew install terraform

   # Linux
   wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
   unzip terraform_1.6.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

2. **Configure AWS Credentials**:
   ```bash
   aws configure
   # Enter your AWS Access Key ID
   # Enter your AWS Secret Access Key
   # Enter your default region (e.g., us-east-1)
   ```

3. **Update Terraform Variables**:
   ```bash
   cd aws/terraform/
   cp terraform.tfvars.example terraform.tfvars
   vim terraform.tfvars

   # Update:
   # - admin_ip_whitelist
   # - blocked_countries
   # - alert_email
   ```

4. **Deploy WAF Configuration**:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

### WAF Rules Included

1. **Rate Limiting**: 2,000 requests per 5 minutes per IP
2. **AWS Managed Core Rule Set**: Protection against common attacks
3. **Known Bad Inputs**: Block malicious payloads
4. **SQL Injection Protection**: Block SQLi attempts
5. **Geographic Blocking**: Block specific countries (configurable)
6. **IP Reputation**: Block known malicious IPs
7. **Anonymous IP**: Block Tor, VPNs, hosting providers (optional)

### Associate WAF with Resources

After deploying WAF, associate it with:

**Application Load Balancer**:
```bash
aws wafv2 associate-web-acl \
  --web-acl-arn <WAF_ARN> \
  --resource-arn <ALB_ARN>
```

**API Gateway**:
```bash
aws wafv2 associate-web-acl \
  --web-acl-arn <WAF_ARN> \
  --resource-arn <API_GATEWAY_ARN>
```

**CloudFront Distribution**:
```bash
# Use CLOUDFRONT scope when creating WAF
# Then associate in CloudFront settings
```

## Monitoring and Alerts

### Cloudflare Analytics

- Dashboard > Analytics > Security
- View blocked requests
- Bot traffic analysis
- Rate limiting metrics

### AWS CloudWatch

Monitor DDoS events:
```bash
# View WAF metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name BlockedRequests \
  --dimensions Name=WebACL,Value=<WAF_NAME> \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

### Alerting

Alerts are configured for:
- DDoS attack detection (AWS Shield)
- WAF rule triggers
- Rate limit violations

Alerts sent to:
- Email (SNS)
- Slack (optional - configure webhook)
- PagerDuty (optional)

## Testing DDoS Protection

### Test Rate Limiting

```bash
# Test API rate limit
for i in {1..150}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://yourdomain.com/api/health
done

# Should see 429 responses after threshold
```

### Test Geographic Blocking

```bash
# Use VPN/proxy from blocked country
curl -H "CF-IPCountry: CN" https://yourdomain.com/
# Should return 403
```

### Test Bot Protection

```bash
# Requests without proper User-Agent may be blocked
curl -A "BadBot/1.0" https://yourdomain.com/
```

## Cost Estimates

### Cloudflare

- **Free Plan**: $0/month - Basic DDoS protection
- **Pro Plan**: $20/month - Advanced features
- **Business Plan**: $200/month - Enhanced security
- **Enterprise**: Custom pricing - Full DDoS protection

### AWS

- **Shield Standard**: $0 (included)
- **Shield Advanced**: $3,000/month
- **WAF**: ~$5/month base + $1/million requests
- **CloudWatch Logs**: ~$0.50/GB ingested

### Recommended Setup

For most applications:
- **Cloudflare Free/Pro** + **AWS Shield Standard** + **AWS WAF**
- Total cost: ~$20-30/month
- Provides excellent protection without Shield Advanced

## Best Practices

1. **Layer Defense**: Use both Cloudflare and AWS for redundancy
2. **Monitor Continuously**: Set up alerts and review logs daily
3. **Test Regularly**: Run simulated attacks to verify protection
4. **Update Rules**: Review and update WAF rules monthly
5. **Whitelist Carefully**: Only whitelist necessary IPs
6. **Rate Limits**: Set conservative limits, adjust based on usage
7. **Logging**: Keep detailed logs for forensic analysis
8. **Incident Response**: Have a plan for DDoS events

## Incident Response

If under attack:

1. **Cloudflare**:
   - Enable "Under Attack Mode" (I'm Under Attack)
   - Increases security level to maximum
   - Shows interstitial page to verify visitors

2. **AWS**:
   - Contact AWS Shield DRT (if Shield Advanced)
   - Review WAF logs in CloudWatch
   - Temporarily block offending IPs/countries

3. **Application**:
   - Enable maintenance mode if needed
   - Scale infrastructure if possible
   - Contact your hosting provider

## Support

- **Cloudflare**: https://support.cloudflare.com
- **AWS Shield**: AWS Support (requires support plan)
- **AWS WAF**: https://docs.aws.amazon.com/waf/

## Additional Resources

- [Cloudflare DDoS Protection](https://www.cloudflare.com/ddos/)
- [AWS Shield Documentation](https://docs.aws.amazon.com/shield/)
- [AWS WAF Developer Guide](https://docs.aws.amazon.com/waf/)
- [OWASP DDoS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
