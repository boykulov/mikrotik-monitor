-- NebulaNet ClickHouse schema

CREATE TABLE IF NOT EXISTS flows (
    ts           DateTime CODEC(DoubleDelta, LZ4),
    location_id  UInt16,
    user_id      UInt32,
    src_ip       IPv4,
    dst_ip       IPv4,
    domain       LowCardinality(String),
    sni_host     LowCardinality(String),
    proto        UInt8,
    src_port     UInt16,
    dst_port     UInt16,
    bytes_in     UInt64,
    bytes_out    UInt64,
    packets_in   UInt32,
    packets_out  UInt32
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (location_id, user_id, ts)
TTL ts + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;

-- Aggregated view: per domain per user per day
CREATE MATERIALIZED VIEW IF NOT EXISTS domain_stats_mv
ENGINE = SummingMergeTree()
ORDER BY (location_id, date, domain, user_id)
POPULATE
AS SELECT
    location_id,
    toDate(ts)      AS date,
    domain,
    user_id,
    sum(bytes_in + bytes_out) AS total_bytes,
    count()         AS requests
FROM flows
GROUP BY location_id, date, domain, user_id;

-- Aggregated view: per user per day
CREATE MATERIALIZED VIEW IF NOT EXISTS user_daily_mv
ENGINE = SummingMergeTree()
ORDER BY (location_id, date, user_id)
POPULATE
AS SELECT
    location_id,
    toDate(ts)      AS date,
    user_id,
    sum(bytes_in + bytes_out) AS total_bytes,
    count()         AS sessions
FROM flows
GROUP BY location_id, date, user_id;

-- Hourly traffic for charts
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_traffic_mv
ENGINE = SummingMergeTree()
ORDER BY (location_id, hour, user_id)
POPULATE
AS SELECT
    location_id,
    toStartOfHour(ts) AS hour,
    user_id,
    sum(bytes_in + bytes_out) AS total_bytes
FROM flows
GROUP BY location_id, hour, user_id;
