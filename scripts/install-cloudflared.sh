#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run with sudo:"
  echo "  sudo bash scripts/install-cloudflared.sh"
  exit 1
fi

echo "Cleaning up any broken cloudflared apt files from previous paste attempts..."
rm -f /usr/share/keyring /etc/apt/sources.list.d/clo

echo "Installing Cloudflare package signing key..."
mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  -o /usr/share/keyrings/cloudflare-main.gpg
chmod 0644 /usr/share/keyrings/cloudflare-main.gpg

echo "Adding Cloudflare cloudflared apt repository..."
cat >/etc/apt/sources.list.d/cloudflared.list <<'EOF'
deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main
EOF

echo "Updating apt package lists..."
apt-get update

echo "Installing cloudflared..."
apt-get install -y cloudflared

echo "Installed:"
cloudflared --version

echo
echo "To expose the local Vite app over HTTPS, run:"
echo "  cloudflared tunnel --url http://localhost:5173"
