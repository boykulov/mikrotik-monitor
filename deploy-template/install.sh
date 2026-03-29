#!/bin/bash
# ============================================================
# NebulaNet Monitor v1.0 — Скрипт установки для нового клиента
# Использование: bash install.sh
# ============================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}"
echo "  _   _      _           _       _   _      _   "
echo " | \ | | ___| |__  _   _| | __ _| \ | | ___| |_ "
echo " |  \| |/ _ \ '_ \| | | | |/ _\` |  \| |/ _ \ __|"
echo " | |\  |  __/ |_) | |_| | | (_| | |\  |  __/ |_ "
echo " |_| \_|\___|_.__/ \__,_|_|\__,_|_| \_|\___|\__|"
echo ""
echo -e "${NC}        Network Monitor v1.0 — Установка"
echo "=============================================="
echo ""

# ─── Проверки ───────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Запускай от root: sudo bash install.sh${NC}"
  exit 1
fi

command -v docker >/dev/null 2>&1 || {
  echo -e "${YELLOW}Docker не найден. Устанавливаем...${NC}"
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
}

command -v docker-compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1 || {
  echo -e "${YELLOW}Docker Compose не найден. Устанавливаем...${NC}"
  apt-get install -y docker-compose-plugin 2>/dev/null || \
  curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose
}

# ─── Сбор данных ────────────────────────────────────────
echo -e "${BLUE}Введите данные для настройки:${NC}"
echo ""

read -p "📋 Название организации (например: MyCompany): " ORG_NAME
read -p "🔑 License Key (из NebulaNet Admin): " LICENSE_KEY
read -p "🌐 IP MikroTik устройства: " MIKROTIK_HOST
read -p "👤 Пользователь MikroTik API [nebulanet]: " MIKROTIK_USER
MIKROTIK_USER=${MIKROTIK_USER:-nebulanet}
read -s -p "🔒 Пароль MikroTik API: " MIKROTIK_PASS
echo ""
read -p "🤖 Anthropic API Key (для AI анализа, Enter пропустить): " ANTHROPIC_KEY
read -p "🔗 NebulaNet Admin URL [http://admin.nebulanet.uz:3001]: " ADMIN_URL
ADMIN_URL=${ADMIN_URL:-http://admin.nebulanet.uz:3001}

# Пароли БД
PG_PASS=$(openssl rand -base64 16 | tr -d '=+/' | cut -c1-16)
CH_PASS=$(openssl rand -base64 16 | tr -d '=+/' | cut -c1-16)
ADMIN_PASS=$(openssl rand -base64 12 | tr -d '=+/' | cut -c1-12)

echo ""
echo -e "${YELLOW}📁 Создаём директорию /opt/nebulanet...${NC}"
mkdir -p /opt/nebulanet
cd /opt/nebulanet

# ─── Клонируем репозиторий ──────────────────────────────
if [ ! -d ".git" ]; then
  echo -e "${YELLOW}📥 Скачиваем NebulaNet...${NC}"
  git clone https://github.com/boykulov/mikrotik-monitor.git .
fi

# ─── Создаём .env ───────────────────────────────────────
cat > .env << ENVEOF
# NebulaNet Monitor — ${ORG_NAME}
# Создан: $(date)

POSTGRES_DB=nebulanet
POSTGRES_USER=nebulanet
POSTGRES_PASSWORD=${PG_PASS}

CLICKHOUSE_DB=nebulanet
CLICKHOUSE_USER=nebulanet
CLICKHOUSE_PASSWORD=${CH_PASS}

ADMIN_PASSWORD=${ADMIN_PASS}
ANTHROPIC_API_KEY=${ANTHROPIC_KEY}

MIKROTIK_HOST=${MIKROTIK_HOST}
MIKROTIK_USER=${MIKROTIK_USER}
MIKROTIK_PASS=${MIKROTIK_PASS}

LICENSE_KEY=${LICENSE_KEY}
ADMIN_URL=${ADMIN_URL}

POSTGRES_DSN=postgresql://nebulanet:${PG_PASS}@postgres:5432/nebulanet
ENVEOF

echo -e "${GREEN}✅ .env создан${NC}"

# ─── Запускаем ──────────────────────────────────────────
echo -e "${YELLOW}🚀 Запускаем контейнеры...${NC}"
docker compose up -d

echo -e "${YELLOW}⏳ Ждём запуска (30 сек)...${NC}"
sleep 30

# Проверяем
if docker compose ps | grep -q "Up"; then
  echo ""
  echo -e "${GREEN}=============================================="
  echo "  ✅ NebulaNet успешно установлен!"
  echo "=============================================="
  echo ""
  echo -e "  🌐 Мониторинг:  http://$(hostname -I | awk '{print $1}'):8000"
  echo -e "  👤 Логин:       admin"
  echo -e "  🔒 Пароль:      ${ADMIN_PASS}"
  echo ""
  echo -e "  📋 Организация: ${ORG_NAME}"
  echo -e "  🔑 License Key: ${LICENSE_KEY}"
  echo ""
  echo -e "  ⚙️  Настройка MikroTik:"
  echo -e "  Выполни команды на MikroTik (${MIKROTIK_HOST}):"
  echo ""
  echo -e "  /ip traffic-flow set enabled=yes interfaces=all"
  echo -e "  /ip traffic-flow target add dst-address=$(hostname -I | awk '{print $1}') port=2055 version=9"
  echo -e "  /system logging action set remote remote=$(hostname -I | awk '{print $1}') remote-port=514"
  echo -e "  /system logging add topics=dns action=remote"
  echo ""
  echo -e "  💾 Данные сохранены в /opt/nebulanet/.env${NC}"
  echo "=============================================="
else
  echo -e "${RED}❌ Ошибка запуска. Проверь логи: docker compose logs${NC}"
fi
