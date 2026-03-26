# NebulaNet — Контекст проекта для Claude

## Что это
SaaS платформа мониторинга сети на базе MikroTik.
Текущая версия: v1.0 (одна организация — Uzbfreight)

## Сервер
- IP: 192.168.1.53 (ubuntuclient, user: tehron)
- Path: /home/tehron/nebulanet
- SSH: tehron@192.168.1.53
- GitHub: git@github.com:boykulov/mikrotik-monitor.git

## MikroTik
- IP: 192.168.1.200 (CCR2004-16G-2S+, RouterOS 7.16.2)
- API user: nebulanet / Nebula2026! (group: write)
- Admin: admin / KQw6PN0UKz3D05O
- NetFlow → :2055/udp, Syslog → :514/udp

## Стек
- FastAPI + Python (api/main.py)
- Dashboard: Single HTML (api/dashboard.html)
- PostgreSQL + ClickHouse + Redis
- Docker Compose
- librouteros для MikroTik API

## Credentials (.env)
- POSTGRES_PASSWORD=nebulanet_secret
- CLICKHOUSE_PASSWORD=nebulanet_secret
- ADMIN_PASSWORD=admin2024
- ANTHROPIC_API_KEY=<в .env файле>
- MIKROTIK_HOST=192.168.1.200
- MIKROTIK_USER=nebulanet
- MIKROTIK_PASS=Nebula2026!

## БД PostgreSQL (таблицы)
- devices — устройства (ip_current, mac_address, last_seen)
- users — пользователи
- domain_categories — 535+ категорий доменов
- blocked_domains — история блокировок (domain, department)
- departments — отделы через MikroTik address-list

## ClickHouse (таблицы)
- nebulanet.flows — NetFlow данные TTL 90д
- nebulanet.dns_log — DNS запросы TTL 90д

## MikroTik структура
- address-list "block" — список заблокированных доменов
- address-list "dispatch_department", "IT_department" — отделы
- filter rule: src-list=ОТДЕЛ dst-list=block → reject (в самом верху)
- Правило *6: src=192.168.10.0/23 → block (старое системное)

## Подсети
- 192.168.1.0/24 — User (основная)
- 192.168.10.0/23 — wifi_admin
- 192.168.12.0/23 — staffwifi
- 192.168.20.0/23 — hotspot
- 192.168.88.x — камеры (не мониторить)

## Что реализовано в v1.0
1. Real-time мониторинг DNS + NetFlow
2. 161 устройство с категориями (Работа/Соцсети/Игры/Развлечения)
3. Фильтры времени 1ч/24ч/Всё для категорий
4. Трафик по устройствам 1ч/1д/7д/30д
5. AI анализ доменов (Claude API, $15 кредитов)
6. Блокировка доменов по отделу или подсети
7. Управление отделами (address-list в MikroTik)
8. 535 категорий сохранены в PostgreSQL
9. Страницы: Мониторинг / Блокировки / Отделы

## План v2.0 (следующий этап)
1. Super Admin портал (отдельный домен/порт)
2. Multi-tenant: организации с изоляцией данных
3. Роли: SuperAdmin / OrgAdmin / Manager / Viewer
4. Биллинг: тарифы Basic/Pro/Enterprise
5. AI как платная фича (вкл/выкл по организации)
6. Captive Portal интеграция
7. Telegram алерты
8. Еженедельные PDF отчёты
9. Аномалии трафика (AI детекция)
10. Bandwidth limits через MikroTik Queue

## Tech spec Super Admin
Файл: /home/tehron/nebulanet/tech-spec-superadmin.html
Стек: Next.js 14 + PostgreSQL + Prisma + NextAuth

## Важные команды
```bash
# Перезапуск API
docker compose up -d --build api

# Логи
docker compose logs collector -f
docker compose logs api -f

# Push в GitHub
cd /home/tehron/nebulanet && git add -A && git commit -m "msg" && git push
```
