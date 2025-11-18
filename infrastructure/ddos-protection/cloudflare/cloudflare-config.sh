#!/bin/bash

# Cloudflare DDoS Protection Configuration Script
# Configures Cloudflare settings via API for maximum protection

set -e

# Configuration - Set these before running
CLOUDFLARE_EMAIL="your-email@example.com"
CLOUDFLARE_API_KEY="your-global-api-key"
CLOUDFLARE_ZONE_ID="your-zone-id"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Cloudflare DDoS Protection Setup"
echo "========================================="
echo ""

# Function to make Cloudflare API calls
cf_api() {
  local method=$1
  local endpoint=$2
  local data=$3

  if [ -z "$data" ]; then
    curl -s -X "$method" "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/$endpoint" \
      -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
      -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
      -H "Content-Type: application/json"
  else
    curl -s -X "$method" "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/$endpoint" \
      -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
      -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
      -H "Content-Type: application/json" \
      -d "$data"
  fi
}

# Enable Under Attack Mode (optional - very aggressive)
enable_under_attack() {
  echo -e "${YELLOW}[Optional] Enabling Under Attack Mode...${NC}"
  cf_api PATCH "settings/security_level" '{"value":"under_attack"}'
  echo -e "${GREEN}Under Attack Mode enabled${NC}"
}

# Configure Rate Limiting
echo "[1/8] Configuring rate limiting..."
cf_api POST "rate_limits" '{
  "description": "API Rate Limit",
  "match": {
    "request": {
      "url": "*/api/*"
    }
  },
  "threshold": 100,
  "period": 60,
  "action": {
    "mode": "challenge",
    "timeout": 86400
  }
}'
echo -e "${GREEN}✓ Rate limiting configured${NC}"

# Enable Bot Fight Mode
echo "[2/8] Enabling Bot Fight Mode..."
cf_api PATCH "settings/bot_fight_mode" '{"value":"on"}'
echo -e "${GREEN}✓ Bot Fight Mode enabled${NC}"

# Enable Browser Integrity Check
echo "[3/8] Enabling Browser Integrity Check..."
cf_api PATCH "settings/browser_check" '{"value":"on"}'
echo -e "${GREEN}✓ Browser Integrity Check enabled${NC}"

# Enable Hotlink Protection
echo "[4/8] Enabling Hotlink Protection..."
cf_api PATCH "settings/hotlink_protection" '{"value":"on"}'
echo -e "${GREEN}✓ Hotlink Protection enabled${NC}"

# Configure Security Level
echo "[5/8] Setting Security Level to High..."
cf_api PATCH "settings/security_level" '{"value":"high"}'
echo -e "${GREEN}✓ Security Level set to High${NC}"

# Enable Always Use HTTPS
echo "[6/8] Enabling Always Use HTTPS..."
cf_api PATCH "settings/always_use_https" '{"value":"on"}'
echo -e "${GREEN}✓ Always Use HTTPS enabled${NC}"

# Configure Minimum TLS Version
echo "[7/8] Setting Minimum TLS Version to 1.2..."
cf_api PATCH "settings/min_tls_version" '{"value":"1.2"}'
echo -e "${GREEN}✓ Minimum TLS Version set to 1.2${NC}"

# Enable TLS 1.3
echo "[8/8] Enabling TLS 1.3..."
cf_api PATCH "settings/tls_1_3" '{"value":"on"}'
echo -e "${GREEN}✓ TLS 1.3 enabled${NC}"

echo ""
echo "========================================="
echo "Cloudflare Configuration Complete!"
echo "========================================="
echo ""
echo "Additional recommended settings:"
echo "1. Enable Cloudflare WAF (Web Application Firewall)"
echo "2. Configure Page Rules for additional protection"
echo "3. Set up Firewall Rules to block specific threats"
echo "4. Enable DNSSEC for domain security"
echo "5. Configure Load Balancing for high availability"
echo ""
echo "Manual steps required:"
echo "1. Go to Cloudflare Dashboard > Security > WAF"
echo "2. Enable OWASP ModSecurity Core Rule Set"
echo "3. Review and customize WAF rules"
echo "4. Set up custom Firewall Rules as needed"
echo ""
