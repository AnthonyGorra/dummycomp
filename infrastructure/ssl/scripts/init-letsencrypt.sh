#!/bin/bash

# Let's Encrypt SSL Certificate Initialization Script
# This script sets up SSL certificates for the first time

set -e

# Configuration
DOMAINS=(YOUR_DOMAIN.com www.YOUR_DOMAIN.com)
EMAIL="admin@YOUR_DOMAIN.com"
STAGING=1  # Set to 1 for testing, 0 for production certificates

# Paths
CERTBOT_PATH="./ssl/certbot"
NGINX_CONF_PATH="./ssl/nginx/conf.d/app.conf"

echo "========================================="
echo "Let's Encrypt SSL Setup"
echo "========================================="
echo ""

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "Error: docker-compose is not installed"
    exit 1
fi

# Create required directories
echo "[1/6] Creating directories..."
mkdir -p "$CERTBOT_PATH/conf"
mkdir -p "$CERTBOT_PATH/www"
mkdir -p "$CERTBOT_PATH/logs"

# Download recommended TLS parameters if not exists
if [ ! -e "$CERTBOT_PATH/conf/options-ssl-nginx.conf" ] || [ ! -e "$CERTBOT_PATH/conf/ssl-dhparams.pem" ]; then
    echo "[2/6] Downloading recommended TLS parameters..."
    mkdir -p "$CERTBOT_PATH/conf"
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$CERTBOT_PATH/conf/options-ssl-nginx.conf"
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$CERTBOT_PATH/conf/ssl-dhparams.pem"
else
    echo "[2/6] TLS parameters already exist, skipping..."
fi

# Create dummy certificate for nginx to start
echo "[3/6] Creating dummy certificate..."
DOMAIN="${DOMAINS[0]}"
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"

docker-compose -f docker-compose.ssl.yml run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout '$CERT_PATH/privkey.pem' \
    -out '$CERT_PATH/fullchain.pem' \
    -subj '/CN=localhost'" certbot || true

# Start nginx
echo "[4/6] Starting nginx..."
docker-compose -f docker-compose.ssl.yml up -d nginx

# Delete dummy certificate
echo "[5/6] Deleting dummy certificate..."
docker-compose -f docker-compose.ssl.yml run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/$DOMAIN && \
  rm -rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot || true

# Request Let's Encrypt certificate
echo "[6/6] Requesting Let's Encrypt certificate..."

# Build domain arguments
DOMAIN_ARGS=""
for DOMAIN in "${DOMAINS[@]}"; do
  DOMAIN_ARGS="$DOMAIN_ARGS -d $DOMAIN"
done

# Staging or production
if [ $STAGING != "0" ]; then
    STAGING_ARG="--staging"
    echo "Using Let's Encrypt staging server (for testing)"
else
    STAGING_ARG=""
    echo "Using Let's Encrypt production server"
fi

docker-compose -f docker-compose.ssl.yml run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $STAGING_ARG \
    --email $EMAIL \
    $DOMAIN_ARGS \
    --rsa-key-size 4096 \
    --agree-tos \
    --no-eff-email \
    --force-renewal" certbot

# Reload nginx
echo "Reloading nginx..."
docker-compose -f docker-compose.ssl.yml exec nginx nginx -s reload

echo ""
echo "========================================="
echo "SSL Setup Complete!"
echo "========================================="
echo ""
echo "Your SSL certificates have been issued and installed."
echo ""
echo "Next steps:"
echo "1. Update YOUR_DOMAIN.com in nginx configuration to your actual domain"
echo "2. If you used staging mode, run this script again with STAGING=0"
echo "3. Certificates will auto-renew every 12 hours"
echo ""
echo "Check certificate status:"
echo "  docker-compose -f docker-compose.ssl.yml run --rm certbot certificates"
echo ""
