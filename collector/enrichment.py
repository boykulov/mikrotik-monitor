"""
EnrichmentEngine — обогащение данных в реальном времени.

Отвечает за:
  - кэш DNS: IP → последний запрошенный домен (TTL из env)
  - кэш DHCP: IP → user_id (из PostgreSQL через MAC → device → user)
  - регистрацию новых устройств при первом появлении
"""
import asyncio
import logging
import os
import time

import asyncpg
import redis.asyncio as aioredis

log = logging.getLogger("enrichment")

DNS_CACHE_TTL  = int(os.getenv("DNS_CACHE_TTL", 300))     # секунды
DHCP_LEASE_TTL = int(os.getenv("DHCP_LEASE_TTL", 86400))  # секунды

REDIS_PREFIX_DNS  = "nb:dns:"   # nb:dns:<ip> → domain
REDIS_PREFIX_USER = "nb:usr:"   # nb:usr:<ip> → user_id
REDIS_PREFIX_MAC  = "nb:mac:"   # nb:mac:<mac> → user_id


class EnrichmentEngine:
    def __init__(self):
        self._redis: aioredis.Redis | None = None
        self._pg: asyncpg.Pool | None = None

    async def connect(self):
        redis_host = os.getenv("REDIS_HOST", "redis")
        redis_port = int(os.getenv("REDIS_PORT", 6379))
        self._redis = aioredis.Redis(
            host=redis_host, port=redis_port,
            decode_responses=True, socket_connect_timeout=5,
        )

        pg_dsn = os.getenv("POSTGRES_DSN")
        self._pg = await asyncpg.create_pool(pg_dsn, min_size=2, max_size=10)

        log.info("EnrichmentEngine connected (Redis + PostgreSQL)")

    # ─── DNS кэш ──────────────────────────────────────────────────

    async def cache_dns(self, src_ip: str, domain: str):
        """Сохраняем связь IP → domain с TTL."""
        key = REDIS_PREFIX_DNS + src_ip
        await self._redis.setex(key, DNS_CACHE_TTL, domain)

    async def get_domain(self, src_ip: str) -> str:
        """Возвращаем последний известный домен для IP или ''."""
        val = await self._redis.get(REDIS_PREFIX_DNS + src_ip)
        return val or ""

    # ─── DHCP / User lookup ───────────────────────────────────────

    async def register_lease(self, ip: str, mac: str, hostname: str = ""):
        """
        Обрабатываем DHCP-аренду:
        1. Ищем/создаём device по MAC
        2. Кэшируем IP → user_id в Redis
        3. Пишем lease в PostgreSQL
        """
        now = int(time.time())
        expires = now + DHCP_LEASE_TTL

        async with self._pg.acquire() as conn:
            # Upsert устройства
            row = await conn.fetchrow(
                """
                INSERT INTO devices (mac_address, hostname, ip_current, last_seen)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (location_id, mac_address) DO UPDATE
                    SET ip_current = EXCLUDED.ip_current,
                        hostname   = COALESCE(NULLIF(EXCLUDED.hostname, ''), devices.hostname),
                        last_seen  = NOW()
                RETURNING id, user_id
                """,
                mac, hostname, ip,
            )
            device_id = row["id"]
            user_id = row["user_id"] or 0

            # Пишем lease
            await conn.execute(
                """
                INSERT INTO dhcp_leases (mac_address, ip_address, hostname, user_id, expires_at)
                VALUES ($1, $2, $3, $4, to_timestamp($5))
                """,
                mac, ip, hostname, user_id or None, expires,
            )

        # Кэшируем в Redis
        await self._redis.setex(REDIS_PREFIX_USER + ip, DHCP_LEASE_TTL, str(user_id))
        await self._redis.setex(REDIS_PREFIX_MAC + mac, DHCP_LEASE_TTL, str(user_id))
        log.debug("Lease registered: %s → %s (user=%d)", mac, ip, user_id)

    async def expire_lease(self, ip: str, mac: str):
        """DHCP-аренда истекла — удаляем из кэша."""
        await self._redis.delete(REDIS_PREFIX_USER + ip)
        log.debug("Lease expired: %s (%s)", ip, mac)

    async def get_user_id(self, ip: str) -> int:
        """
        Возвращаем user_id для IP.
        Сначала Redis, потом PostgreSQL (dhcp_leases).
        """
        # Быстрый путь — Redis
        cached = await self._redis.get(REDIS_PREFIX_USER + ip)
        if cached is not None:
            return int(cached)

        # Медленный путь — PostgreSQL
        async with self._pg.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT user_id FROM dhcp_leases
                WHERE ip_address = $1
                  AND assigned_at <= NOW()
                  AND (expires_at IS NULL OR expires_at >= NOW())
                ORDER BY assigned_at DESC
                LIMIT 1
                """,
                ip,
            )
            user_id = (row["user_id"] or 0) if row else 0

        # Кэшируем результат (даже 0 — чтобы не бить PG)
        await self._redis.setex(REDIS_PREFIX_USER + ip, 300, str(user_id))
        return user_id

    async def assign_user_to_mac(self, mac: str, user_id: int):
        """API вызов: привязать MAC к пользователю."""
        async with self._pg.acquire() as conn:
            await conn.execute(
                "UPDATE devices SET user_id = $1 WHERE mac_address = $2",
                user_id, mac,
            )
        # Инвалидируем кэш по MAC (ip неизвестен здесь)
        await self._redis.delete(REDIS_PREFIX_MAC + mac)
        log.info("MAC %s assigned to user %d", mac, user_id)
