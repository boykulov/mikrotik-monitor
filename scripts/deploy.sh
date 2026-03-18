#!/usr/bin/env bash
# NebulaNet — быстрый деплой на чистый сервер (Ubuntu 22.04 / 24.04)
# Запуск: bash deploy.sh
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[+]${NC} $*"; }
warning() { echo -e "${YELLOW}[!]${NC} $*"; }
error()   { echo -e "${RED}[✗]${NC} $*"; exit 1; }

DEPLOY_DIR="/opt/nebulanet"

info "=== NebulaNet Collector Deploy ==="

# ─── Docker ───────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    info "Installing Docker..."
    curl -fsSL https://get.docker.com | bash
    systemctl enable --now docker
    usermod -aG docker "$USER" || true
else
    info "Docker already installed: $(docker --version)"
fi

if ! docker compose version &>/dev/null; then
    error "Docker Compose plugin not found. Upgrade Docker to v2.20+"
fi

# ─── Копирование файлов ───────────────────────────────────────────
info "Deploying to $DEPLOY_DIR..."
mkdir -p "$DEPLOY_DIR"
cp -r . "$DEPLOY_DIR/"
cd "$DEPLOY_DIR"

# ─── .env файл ────────────────────────────────────────────────────
if [ ! -f .env ]; then
    info "Creating .env..."
    CH_PASS=$(openssl rand -hex 16)
    PG_PASS=$(openssl rand -hex 16)
    SK=$(openssl rand -hex 32)
    cat > .env <<EOF
CLICKHOUSE_PASSWORD=$CH_PASS
POSTGRES_PASSWORD=$PG_PASS
SECRET_KEY=$SK
EOF
    warning ".env created with random passwords — save them!"
    cat .env
else
    info ".env already exists, skipping"
fi

# ─── Firewall (UFW) ───────────────────────────────────────────────
if command -v ufw &>/dev/null; then
    info "Configuring UFW..."
    # API — открыт для всех (ограничить по необходимости)
    ufw allow 8000/tcp comment "NebulaNet API" || true
    # NetFlow — только с IP MikroTik (замени на свой IP!)
    ufw allow from any to any port 2055 proto udp comment "NetFlow" || true
    # Syslog — только с IP MikroTik
    ufw allow from any to any port 514 proto udp comment "Syslog" || true
    warning "Firewall: ограничь порты 2055 и 514 до IP своего MikroTik!"
fi

# ─── Запуск ───────────────────────────────────────────────────────
info "Building and starting containers..."
docker compose pull --quiet
docker compose build --quiet
docker compose up -d

info "Waiting for services to be healthy..."
sleep 10
docker compose ps

SERVER_IP=$(hostname -I | awk '{print $1}')
info ""
info "=== NebulaNet запущен! ==="
info "API:        http://$SERVER_IP:8000"
info "API docs:   http://$SERVER_IP:8000/docs"
info "Health:     http://$SERVER_IP:8000/api/health"
info ""
info "=== Настройка MikroTik ==="
echo "  /ip traffic-flow set enabled=yes interfaces=all"
echo "  /ip traffic-flow target add dst-address=$SERVER_IP port=2055 version=9"
echo "  /system logging action set remote remote=$SERVER_IP remote-port=514"
echo "  /system logging add topics=dns,dhcp action=remote"
info ""
warning "Не забудь:"
warning "  1. Ограничить 2055/514 до IP MikroTik в firewall"
warning "  2. Настроить HTTPS (nginx + certbot) для API"
warning "  3. Изменить пароли из .env в продакшне"
