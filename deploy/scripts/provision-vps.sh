#!/usr/bin/env bash
# Provision Ubuntu 22.04/24.04 for MyQRCards (Docker, Nginx, Certbot, deploy user, /opt/myqrcards).
# Run as root on a fresh VPS:
#   curl -fsSL ... | bash
#   OR: scp + sudo bash deploy/scripts/provision-vps.sh
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_DIR="${APP_DIR:-/opt/myqrcards}"
DOMAIN="${DOMAIN:-}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y \
  ca-certificates curl gnupg ufw fail2ban \
  nginx certbot python3-certbot-nginx \
  git jq unzip

# Docker Engine + Compose plugin
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  . /etc/os-release
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

systemctl enable --now docker
systemctl enable --now nginx
systemctl enable --now fail2ban

# Deploy user
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0755 "$APP_DIR"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0750 "$APP_DIR/backups"
install -d -m 0755 /var/www/certbot

# SSH hardening hints (do not lock you out automatically)
SSHD="/etc/ssh/sshd_config"
if [[ -f "$SSHD" ]]; then
  sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD" || true
  sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' "$SSHD" || true
  systemctl reload sshd || systemctl reload ssh || true
fi

# Firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Nginx site placeholder
SITE_SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)/nginx"
if [[ -f "$SITE_SRC_DIR/myqrcards.conf" ]]; then
  if [[ -n "$DOMAIN" ]]; then
    sed "s/DOMAIN/${DOMAIN}/g" "$SITE_SRC_DIR/myqrcards.conf" \
      > /etc/nginx/sites-available/myqrcards
  else
    cp "$SITE_SRC_DIR/myqrcards.conf" /etc/nginx/sites-available/myqrcards
    echo "NOTE: replace DOMAIN in /etc/nginx/sites-available/myqrcards before enabling HTTPS."
  fi
  ln -sfn /etc/nginx/sites-available/myqrcards /etc/nginx/sites-enabled/myqrcards
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl reload nginx
fi

echo
echo "Provision complete."
echo "  deploy user : $DEPLOY_USER (docker group)"
echo "  app dir     : $APP_DIR"
echo "Next:"
echo "  1) Install your SSH public key for $DEPLOY_USER"
echo "  2) Point DNS A/AAAA to this server"
echo "  3) Copy repo + .env.production into $APP_DIR"
echo "  4) Run deploy/scripts/deploy.sh as $DEPLOY_USER"
if [[ -n "$DOMAIN" ]]; then
  echo "  5) sudo certbot --nginx -d $DOMAIN"
else
  echo "  5) Set DOMAIN in nginx site, then: sudo certbot --nginx -d <domain>"
fi
