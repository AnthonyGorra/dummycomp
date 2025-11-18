#!/bin/bash

# WireGuard Client Management Script
# Adds a new client to the VPN

set -e

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo)"
  exit 1
fi

# Get client name
read -p "Enter client name (e.g., admin1, developer1): " CLIENT_NAME

if [ -z "$CLIENT_NAME" ]; then
  echo "Client name cannot be empty"
  exit 1
fi

# Check if client already exists
if [ -f "/etc/wireguard/clients/${CLIENT_NAME}_private.key" ]; then
  echo "Client $CLIENT_NAME already exists!"
  exit 1
fi

# Create clients directory
mkdir -p /etc/wireguard/clients

# Get next available IP
LAST_IP=$(grep "AllowedIPs" /etc/wireguard/wg0.conf | tail -1 | awk -F'[./]' '{print $4}')
if [ -z "$LAST_IP" ]; then
  NEXT_IP=2
else
  NEXT_IP=$((LAST_IP + 1))
fi

CLIENT_IP="10.8.0.${NEXT_IP}"

echo "Assigning IP: $CLIENT_IP/32"

# Generate client keys
cd /etc/wireguard/clients
umask 077
wg genkey | tee ${CLIENT_NAME}_private.key | wg pubkey > ${CLIENT_NAME}_public.key

CLIENT_PRIVATE_KEY=$(cat ${CLIENT_NAME}_private.key)
CLIENT_PUBLIC_KEY=$(cat ${CLIENT_NAME}_public.key)
SERVER_PUBLIC_KEY=$(cat /etc/wireguard/server_public.key)
SERVER_IP=$(curl -s ifconfig.me)

# Add peer to server config
cat >> /etc/wireguard/wg0.conf << EOF

# Client: ${CLIENT_NAME}
[Peer]
PublicKey = ${CLIENT_PUBLIC_KEY}
AllowedIPs = ${CLIENT_IP}/32
PersistentKeepalive = 25
EOF

# Create client configuration file
cat > ${CLIENT_NAME}.conf << EOF
# WireGuard VPN Client Configuration
# Client: ${CLIENT_NAME}

[Interface]
PrivateKey = ${CLIENT_PRIVATE_KEY}
Address = ${CLIENT_IP}/24
DNS = 1.1.1.1, 8.8.8.8

[Peer]
PublicKey = ${SERVER_PUBLIC_KEY}
Endpoint = ${SERVER_IP}:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
EOF

# Generate QR code for mobile devices (if qrencode is installed)
if command -v qrencode &> /dev/null; then
  qrencode -t ansiutf8 < ${CLIENT_NAME}.conf
  qrencode -o ${CLIENT_NAME}.png < ${CLIENT_NAME}.conf
  echo "QR code saved to: /etc/wireguard/clients/${CLIENT_NAME}.png"
fi

# Restart WireGuard
systemctl restart wg-quick@wg0

echo ""
echo "========================================="
echo "Client Added Successfully!"
echo "========================================="
echo ""
echo "Client Name: ${CLIENT_NAME}"
echo "Client IP: ${CLIENT_IP}"
echo "Configuration file: /etc/wireguard/clients/${CLIENT_NAME}.conf"
echo ""
echo "Share the configuration file securely with the client."
echo "They can import it into WireGuard client applications."
echo ""
