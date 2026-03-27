# NebulaNet — Контекст проекта для Claude

## Что это
SaaS платформа мониторинга сети на базе MikroTik.
Архитектура: v2.0 (Super Admin) управляет множеством v1.0 (мониторинг локаций).

## Серверы
- **Текущий сервер**: 192.168.1.53 (user: tehron)
- **v1.0 path**: /home/tehron/nebulanet (порт 8000)
- **v2.0 path**: /home/tehron/nebulanet/admin (порт 3001)
- **GitHub**: github.com/boykulov/mikrotik-monitor

## Архитектура (Путь A — два отдельных сервиса)
```
VPS-2 (центральный)              VPS-1 / локально (клиент)
┌─────────────────────┐          ┌──────────────────────┐
│ v2.0 Super Admin    │◄────────►│ v1.0 Мониторинг      │
│ :3001               │  license │ :8000                │
│ Только ты           │  check   │ Клиент видит своё    │
│ Управляешь всем     │          │ Login/Logout          │
└─────────────────────┘          └──────────────────────┘
```

## MikroTik (Uzbfreight)
- IP: 192.168.1.200 (CCR2004-16G-2S+, RouterOS 7.16.2)
- API user: nebulanet / Nebula2026! (group: write)
- NetFlow → :2055/udp, Syslog → :514/udp

## Стек v1.0
- FastAPI + Python (api/main.py) — 985 строк
- Dashboard: Single HTML (api/dashboard.html)
- PostgreSQL (nebulanet) + ClickHouse + Redis
- Docker Compose (порт 8000)
- Авторизация: cookie nn_session, таблица org_admins

## Стек v2.0 (Super Admin Portal)
- Next.js 16 + TypeScript + Tailwind + Shadcn/ui
- Prisma 6 + PostgreSQL (nebulanet_v2)
- Cookie auth (nebulanet_session)
- Порт 3001

## БД v1.0 PostgreSQL (nebulanet)
- devices — 161 устройство
- users — сетевые пользователи (не логины!)
- org_admins — логины для входа в мониторинг
- domain_categories — 535+ категорий
- blocked_domains, departments, locations, routers

## БД v2.0 PostgreSQL (nebulanet_v2)
- super_admins — SuperAdmin (admin@nebulanet.local / NebulaAdmin2024!)
- organizations — Uzbfreight (PRO, AI включён)
- users + user_organizations — пользователи с ролями
- mikrotik_devices, industries (8 шт)
- categories, domains, org_relations
- audit_logs, platform_settings

## ClickHouse (v1.0)
- nebulanet.flows — NetFlow TTL 90д
- nebulanet.dns_log — DNS запросы TTL 90д

## v1.0 Логины
- org_admins: admin / UzbAdmin2024!

## Что сделано
### v1.0
1. Real-time мониторинг DNS + NetFlow (161 устройство)
2. AI анализ доменов (Claude API)
3. Блокировки по отделу/подсети через MikroTik
4. Авторизация: логин/пароль + кнопка выхода

### v2.0
1. Prisma schema (12 таблиц) + миграции
2. Login страница SuperAdmin
3. Dashboard (статистика)
4. Sidebar навигация
5. Страница организаций (таблица)
6. Карточка организации (редактирование)
7. Форма создания организации
8. API: GET/POST /api/organizations, PUT /api/organizations/[id]

## Следующий этап — Система лицензий
1. Добавить license_key в таблицу organizations (v2.0)
2. Endpoint GET /api/license/check?key=XXX в v2.0
3. В v1.0 .env добавить LICENSE_KEY + ADMIN_URL
4. v1.0 проверяет лицензию при входе
5. Страница блокировки если лицензия недействительна
6. Docker шаблон для быстрого деплоя нового клиента

## Подсети Uzbfreight
- 192.168.1.0/24 — User (основная)
- 192.168.10.0/23 — wifi_admin
- 192.168.12.0/23 — staffwifi
- 192.168.20.0/23 — hotspot

## Команды
### v1.0
cd /home/tehron/nebulanet
docker compose up -d --build api
docker compose logs api -f

### v2.0
cd /home/tehron/nebulanet/admin
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
PORT=3001 npm run dev
npx prisma studio
