#!/bin/bash

# SSL Certificate Check Script
# Displays information about installed certificates

set -e

cd "$(dirname "$0")/.."

echo "========================================="
echo "SSL Certificate Status"
echo "========================================="
echo ""

# Show certificate information
docker-compose -f docker-compose.ssl.yml run --rm certbot certificates

echo ""
echo "Certificate expiration check:"
echo ""

# Get domain from nginx config
DOMAIN=$(grep "server_name" ./ssl/nginx/conf.d/app.conf | head -1 | awk '{print $2}' | tr -d ';')

if [ -f "./ssl/certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    openssl x509 -in "./ssl/certbot/conf/live/$DOMAIN/fullchain.pem" -noout -dates
else
    echo "No certificate found for $DOMAIN"
fi
