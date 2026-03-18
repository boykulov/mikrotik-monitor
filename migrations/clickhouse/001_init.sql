-- NebulaNet: ClickHouse schema
-- Выполняется автоматически при первом запуске контейнера

-- ─── Основная таблица потоков ────────────────────────────────────
CREATE TABLE IF NOT EXISTS nebulanet.flows (
    ts           DateTime CODEC(DoubleDelta, LZ4),
    location_id  UInt16   DEFAULT 1,
    user_id      UInt32   DEFAULT 0,
    src_ip       IPv4,
    dst_ip       IPv4,
    src_port     UInt16,
    dst_port     UInt16,
    proto        UInt8,        -- 6=TCP 17=UDP 1=ICMP
    domain       LowCardinality(String)  DEFAULT '',
    sni_host     LowCardinality(String)  DEFAULT '',
    bytes_in     UInt64  DEFAULT 0,
    bytes_out    UInt64  DEFAULT 0,
    packets_in   UInt32  DEFAULT 0,
    packets_out  UInt32  DEFAULT 0
) ENGINE = MergeTree()
PARTITION BY (location_id, toYYYYMM(ts))
ORDER BY (location_id, user_id, ts)
TTL ts + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;

-- ─── Агрегат: трафик по домену за день ──────────────────────────
CREATE TABLE IF NOT EXISTS nebulanet.domain_stats_daily (
    date         Date,
    location_id  UInt16,
    user_id      UInt32,
    domain       LowCardinality(String),
    total_bytes  UInt64,
    requests     UInt64
) ENGINE = SummingMergeTree()
PARTITION BY (location_id, toYYYYMM(date))
ORDER BY (location_id, date, domain, user_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS nebulanet.domain_stats_daily_mv
TO nebulanet.domain_stats_daily
AS SELECT
    toDate(ts)            AS date,
    location_id,
    user_id,
    if(domain != '', domain, sni_host) AS domain,
    sum(bytes_in + bytes_out) AS total_bytes,
    count()               AS requests
FROM nebulanet.flows
WHERE domain != '' OR sni_host != ''
GROUP BY date, location_id, user_id, domain;

-- ─── Агрегат: трафик по пользователю за день ────────────────────
CREATE TABLE IF NOT EXISTS nebulanet.user_stats_daily (
    date         Date,
    location_id  UInt16,
    user_id      UInt32,
    total_bytes  UInt64,
    sessions     UInt64
) ENGINE = SummingMergeTree()
PARTITION BY (location_id, toYYYYMM(date))
ORDER BY (location_id, date, user_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS nebulanet.user_stats_daily_mv
TO nebulanet.user_stats_daily
AS SELECT
    toDate(ts)            AS date,
    location_id,
    user_id,
    sum(bytes_in + bytes_out) AS total_bytes,
    count()               AS sessions
FROM nebulanet.flows
GROUP BY date, location_id, user_id;

-- ─── DNS-лог (сырые запросы) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS nebulanet.dns_log (
    ts          DateTime CODEC(DoubleDelta, LZ4),
    location_id UInt16  DEFAULT 1,
    src_ip      IPv4,
    domain      String,
    qtype       LowCardinality(String)  DEFAULT 'A',  -- A, AAAA, CNAME...
    resolved_ip IPv4    DEFAULT toIPv4('0.0.0.0')
) ENGINE = MergeTree()
PARTITION BY (location_id, toYYYYMM(ts))
ORDER BY (location_id, ts, src_ip)
TTL ts + INTERVAL 30 DAY;
