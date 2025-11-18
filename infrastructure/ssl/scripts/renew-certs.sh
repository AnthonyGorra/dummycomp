#!/bin/bash

# SSL Certificate Renewal Script
# Run this script manually or via cron to renew certificates

set -e

cd "$(dirname "$0")/.."

echo "========================================="
echo "Renewing SSL Certificates"
echo "========================================="
echo ""

# Renew certificates
echo "Running certbot renew..."
docker-compose -f docker-compose.ssl.yml run --rm certbot renew

# Reload nginx to pick up new certificates
echo "Reloading nginx..."
docker-compose -f docker-compose.ssl.yml exec nginx nginx -s reload

echo ""
echo "Certificate renewal complete!"
echo ""

# Show certificate status
docker-compose -f docker-compose.ssl.yml run --rm certbot certificates
