#!/bin/bash
set -e

echo "=== NebulaNet Setup ==="

# Check Docker
if ! command -v docker &>/dev/null; then
  echo "ERROR: Docker not installed. Install from https://docs.docker.com/engine/install/"
  exit 1
fi
if ! docker compose version &>/dev/null; then
  echo "ERROR: Docker Compose v2 not found."
  exit 1
fi

# .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — review passwords before production!"
fi

# Build + start
echo "Building and starting services..."
docker compose up -d --build

echo ""
echo "Waiting for services to be healthy..."
sleep 15

echo ""
echo "=== Status ==="
docker compose ps

echo ""
echo "=== NebulaNet is ready ==="
echo "  API:        http://$(hostname -I | awk '{print $1}'):8000"
echo "  API Docs:   http://$(hostname -I | awk '{print $1}'):8000/docs"
echo "  ClickHouse: http://$(hostname -I | awk '{print $1}'):8123"
echo ""
echo "MikroTik config:"
echo "  NetFlow target: $(hostname -I | awk '{print $1}'):2055 (UDP)"
echo "  Syslog target:  $(hostname -I | awk '{print $1}'):514  (UDP)"
