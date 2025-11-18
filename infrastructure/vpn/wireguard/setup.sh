#!/bin/bash

# WireGuard VPN Setup Script
# This script sets up WireGuard VPN server on Ubuntu/Debian systems

set -e

echo "========================================="
echo "WireGuard VPN Server Setup"
echo "========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo)"
  exit 1
fi

# Update system
echo "[1/7] Updating system packages..."
apt-get update
apt-get upgrade -y

# Install WireGuard
echo "[2/7] Installing WireGuard..."
apt-get install -y wireguard wireguard-tools

# Enable IP forwarding
echo "[3/7] Enabling IP forwarding..."
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
echo "net.ipv6.conf.all.forwarding=1" >> /etc/sysctl.conf
sysctl -p

# Generate server keys
echo "[4/7] Generating server keys..."
cd /etc/wireguard
umask 077
wg genkey | tee server_private.key | wg pubkey > server_public.key

SERVER_PRIVATE_KEY=$(cat server_private.key)
SERVER_PUBLIC_KEY=$(cat server_public.key)

echo "Server Public Key: $SERVER_PUBLIC_KEY"
echo "Server Private Key: $SERVER_PRIVATE_KEY"

# Create server configuration
echo "[5/7] Creating server configuration..."
cat > /etc/wireguard/wg0.conf << EOF
[Interface]
PrivateKey = $SERVER_PRIVATE_KEY
Address = 10.8.0.1/24
ListenPort = 51820
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
EOF

chmod 600 /etc/wireguard/wg0.conf

# Configure firewall
echo "[6/7] Configuring firewall..."
ufw allow 51820/udp
ufw allow OpenSSH
echo "y" | ufw enable

# Start WireGuard
echo "[7/7] Starting WireGuard service..."
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0

echo ""
echo "========================================="
echo "WireGuard VPN Server Setup Complete!"
echo "========================================="
echo ""
echo "Server Public Key: $SERVER_PUBLIC_KEY"
echo ""
echo "Next steps:"
echo "1. Generate client keys with: wg genkey | tee client_private.key | wg pubkey > client_public.key"
echo "2. Add client configuration to /etc/wireguard/wg0.conf"
echo "3. Restart WireGuard: systemctl restart wg-quick@wg0"
echo "4. Check status: wg show"
echo ""
