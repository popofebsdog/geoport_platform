#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

APP_DIR="${APP_DIR:-/opt/geoport_platform}"
APP_USER="${SUDO_USER:-$USER}"
SERVICE_NAME="geoport-platform"

OS_ID=""
if [ -r /etc/os-release ]; then
  OS_ID="$(. /etc/os-release && printf '%s' "$ID")"
fi

if [ "$OS_ID" = "ubuntu" ]; then
  $SUDO apt-get update -y
  $SUDO apt-get install -y git curl ca-certificates gnupg lsb-release ufw docker.io
  if ! docker compose version >/dev/null 2>&1; then
    $SUDO apt-get install -y docker-compose-plugin || $SUDO apt-get install -y docker-compose-v2 || true
  fi
elif [ "$OS_ID" = "amzn" ]; then
  $SUDO dnf update -y
  $SUDO dnf install -y git curl docker docker-compose-plugin firewalld
else
  printf 'Unsupported OS: %s\n' "$OS_ID" >&2
  exit 1
fi

$SUDO systemctl enable docker
$SUDO systemctl start docker

$SUDO mkdir -p /etc/docker
$SUDO bash -c 'cat > /etc/docker/daemon.json <<EOF2
{
  "ip": "127.0.0.1",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  }
}
EOF2'
$SUDO systemctl restart docker

if getent group docker >/dev/null 2>&1; then
  $SUDO usermod -aG docker "$APP_USER" || true
fi

$SUDO mkdir -p "$APP_DIR"
$SUDO chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

if command -v ufw >/dev/null 2>&1; then
  $SUDO ufw allow 22/tcp
  $SUDO ufw allow 80/tcp
  $SUDO ufw allow 443/tcp
  $SUDO ufw --force enable
fi

if command -v firewall-cmd >/dev/null 2>&1; then
  $SUDO systemctl enable firewalld || true
  $SUDO systemctl start firewalld || true
  $SUDO firewall-cmd --permanent --add-service=ssh || true
  $SUDO firewall-cmd --permanent --add-service=http || true
  $SUDO firewall-cmd --permanent --add-service=https || true
  $SUDO firewall-cmd --reload || true
fi

SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
$SUDO bash -c "cat > '$SERVICE_FILE' <<EOF
[Unit]
Description=Geoport Platform Docker Compose Stack
After=network-online.target docker.service
Wants=network-online.target docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.yml -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF"

$SUDO systemctl daemon-reload
$SUDO systemctl enable "$SERVICE_NAME"

printf 'EC2 setup completed.\n'
printf 'App directory: %s\n' "$APP_DIR"
printf 'Log out and back in for docker group changes to apply to %s.\n' "$APP_USER"
