# NebulaNet — Контекст проекта для Claude

## Что это
SaaS платформа мониторинга сети на базе MikroTik.
v2.0 (Super Admin) управляет множеством v1.0 (мониторинг локаций).

## Серверы
- IP: 192.168.1.53 (user: tehron / root)
- v1.0 path: /home/tehron/nebulanet (порт 8000)
- v2.0 path: /home/tehron/nebulanet/admin (порт 3001)
- GitHub: github.com/boykulov/mikrotik-monitor
- Docker network gateway: 172.18.0.1

## Запуск v2.0
cd /home/tehron/nebulanet/admin
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fuser -k 3001/tcp 2>/dev/null
PORT=3001 npm run dev > /tmp/v2.log 2>&1 &

## Запуск v1.0
cd /home/tehron/nebulanet
docker compose up -d

## MikroTik (Uzbfreight)
- IP: 192.168.1.200 (CCR2004-16G-2S+, RouterOS 7.16.2)
- API user: nebulanet / Nebula2026! (group: write)
- NetFlow → :2055/udp, Syslog → :514/udp

## Стек v1.0
- FastAPI + Python (api/main.py)
- Single HTML dashboard (api/dashboard.html)
- PostgreSQL (nebulanet) + ClickHouse + Redis
- Docker Compose (порт 8000)
- Auth: cookie nn_session, таблица org_admins
- License: LICENSE_KEY + ADMIN_URL в .env + docker-compose.yml

## Стек v2.0
- Next.js 16 + TypeScript + Tailwind + Shadcn/ui
- Prisma 6 + PostgreSQL (nebulanet_v2)
- Cookie auth (nebulanet_session)
- Порт 3001

## БД v1.0 (nebulanet)
- devices — 161 устройство
- users — сетевые пользователи
- org_admins — логины (admin / UzbAdmin2024!)
- domain_categories — 535 категорий доменов
- blocked_domains, departments, locations, routers

## БД v2.0 (nebulanet_v2)
- super_admins — admin@nebulanet.local / NebulaAdmin2024!
- organizations — Uzbfreight (PRO, AI=true, isActive=true)
  licenseKey: uzbfreight_JVVyyzkkBsoSQXkdxrhb4svpl6F8zoNt
- mikrotik_devices — Uzbfreight CCR2004 (192.168.1.200)
- categories — 6 глобальных (Работа/Другое/Система/Развлечения/Соцсети/Игры)
- domains — 535 доменов (мигрированы из v1.0)
- users, user_organizations, industries (8 шт)
- audit_logs, platform_settings

## Лицензии
- Uzbfreight key: uzbfreight_JVVyyzkkBsoSQXkdxrhb4svpl6F8zoNt
- ADMIN_URL в v1.0: http://172.18.0.1:3001
- Проверка при входе + F5 + переключение вкладок (кэш 2 мин)
- Страница блокировки: +998993570040 / nebulanet.uz

## Что сделано в v2.0
1. Prisma schema (12 таблиц + licenseKey)
2. Login SuperAdmin
3. Dashboard со статистикой + кнопка синхронизации
4. Организации: список + карточка + создание + быстрый тогл
5. Устройства MikroTik: CRUD + Ping + Ping все
6. Настройки: смена пароля + инструкция через терминал
7. License endpoint GET /api/license/check?key=XXX
8. Sync endpoint POST /api/sync (v1.0 → v2.0)
9. 535 доменов + 6 категорий мигрированы

## Что сделано в v1.0
1. Auth: логин/пароль + выход
2. Система лицензий: блокировка при F5 + вкладки
3. Страница блокировки с контактами

## Следующий этап
1. Страница доменов в v2.0 (просмотр/поиск/фильтр)
2. Страница категорий в v2.0
3. Страница пользователей в v2.0
4. Docker шаблон для деплоя нового клиента на VPS
5. Telegram алерты
6. Heartbeat — v1.0 сообщает v2.0 о статусе

## Подсети Uzbfreight
- 192.168.1.0/24 — User (основная)
- 192.168.10.0/23 — wifi_admin
- 192.168.12.0/23 — staffwifi
- 192.168.20.0/23 — hotspot

## Git
cd /home/tehron/nebulanet
git add -A && git commit -m "msg" && git push origin main
