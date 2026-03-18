"""
ClickHouseWriter — буферизованная запись в ClickHouse.

Аккумулирует записи в памяти и сбрасывает батчами каждые FLUSH_INTERVAL секунд
или при достижении MAX_BUFFER_SIZE записей.
"""
import asyncio
import logging
import os
import time
from dataclasses import asdict

from clickhouse_driver import Client

log = logging.getLogger("storage")

FLUSH_INTERVAL  = int(os.getenv("FLUSH_INTERVAL", 30))
MAX_BUFFER_SIZE = int(os.getenv("MAX_BUFFER_SIZE", 10_000))


class ClickHouseWriter:
    def __init__(self):
        self._flows_buf: list[dict]   = []
        self._dns_buf:   list[dict]   = []
        self._lock = asyncio.Lock()
        self._client: Client | None = None
        self._connect()

    def _connect(self):
        self._client = Client(
            host=os.getenv("CLICKHOUSE_HOST", "clickhouse"),
            port=int(os.getenv("CLICKHOUSE_PORT", 9000)),
            database=os.getenv("CLICKHOUSE_DB", "nebulanet"),
            user=os.getenv("CLICKHOUSE_USER", "nebulanet"),
            password=os.getenv("CLICKHOUSE_PASSWORD", "nebulanet_pass"),
            connect_timeout=10,
            send_receive_timeout=30,
        )
        log.info("ClickHouse client initialized")

    # ─── Буферизация ──────────────────────────────────────────────

    async def add_flows(self, records):
        async with self._lock:
            for rec in records:
                self._flows_buf.append({
                    "ts":          rec.ts,
                    "location_id": rec.location_id,
                    "user_id":     rec.user_id,
                    "src_ip":      rec.src_ip,
                    "dst_ip":      rec.dst_ip,
                    "src_port":    rec.src_port,
                    "dst_port":    rec.dst_port,
                    "proto":       rec.proto,
                    "domain":      rec.domain,
                    "sni_host":    rec.sni_host,
                    "bytes_in":    rec.bytes_in,
                    "bytes_out":   rec.bytes_out,
                    "packets_in":  rec.packets_in,
                    "packets_out": rec.packets_out,
                })

        if len(self._flows_buf) >= MAX_BUFFER_SIZE:
            await self.flush()

    async def add_dns_log(self, record: dict):
        async with self._lock:
            self._dns_buf.append(record)

    # ─── Периодический flush ──────────────────────────────────────

    async def flush_loop(self):
        log.info("Flush loop started (interval=%ds)", FLUSH_INTERVAL)
        while True:
            await asyncio.sleep(FLUSH_INTERVAL)
            await self.flush()

    async def flush(self):
        async with self._lock:
            flows = self._flows_buf[:]
            dns   = self._dns_buf[:]
            self._flows_buf.clear()
            self._dns_buf.clear()

        if flows:
            await asyncio.get_event_loop().run_in_executor(
                None, self._insert_flows, flows
            )

        if dns:
            await asyncio.get_event_loop().run_in_executor(
                None, self._insert_dns, dns
            )

    def _insert_flows(self, rows: list[dict]):
        try:
            self._client.execute(
                """
                INSERT INTO flows (
                    ts, location_id, user_id,
                    src_ip, dst_ip, src_port, dst_port, proto,
                    domain, sni_host,
                    bytes_in, bytes_out, packets_in, packets_out
                ) VALUES
                """,
                rows,
                types_check=False,
            )
            log.info("Flushed %d flow records to ClickHouse", len(rows))
        except Exception as e:
            log.error("ClickHouse insert flows error: %s", e)
            # Переподключаемся при ошибке соединения
            try:
                self._connect()
            except Exception:
                pass

    def _insert_dns(self, rows: list[dict]):
        try:
            self._client.execute(
                """
                INSERT INTO dns_log (ts, location_id, src_ip, domain, qtype)
                VALUES
                """,
                rows,
                types_check=False,
            )
            log.debug("Flushed %d DNS records to ClickHouse", len(rows))
        except Exception as e:
            log.error("ClickHouse insert dns error: %s", e)
