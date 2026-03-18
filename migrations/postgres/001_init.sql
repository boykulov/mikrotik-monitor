-- NebulaNet: PostgreSQL schema

-- ─── Локации (для SaaS multi-tenant) ────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    api_key     VARCHAR(64) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO locations (id, name) VALUES (1, 'Default Location')
ON CONFLICT DO NOTHING;

-- ─── Пользователи ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    location_id INT REFERENCES locations(id) ON DELETE CASCADE DEFAULT 1,
    username    VARCHAR(100) NOT NULL,
    full_name   VARCHAR(200),
    email       VARCHAR(200),
    department  VARCHAR(100),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (location_id, username)
);

-- Системный пользователь для неизвестных устройств
INSERT INTO users (id, username, full_name, location_id)
VALUES (0, 'unknown', 'Unknown Device', 1)
ON CONFLICT DO NOTHING;

-- ─── Устройства ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devices (
    id          SERIAL PRIMARY KEY,
    location_id INT REFERENCES locations(id) ON DELETE CASCADE DEFAULT 1,
    mac_address MACADDR NOT NULL,
    user_id     INT REFERENCES users(id) ON DELETE SET NULL,
    hostname    VARCHAR(200),
    ip_current  INET,
    vendor      VARCHAR(100),
    last_seen   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (location_id, mac_address)
);

CREATE INDEX IF NOT EXISTS idx_devices_mac ON devices(mac_address);
CREATE INDEX IF NOT EXISTS idx_devices_ip ON devices(ip_current);

-- ─── DHCP-аренды ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dhcp_leases (
    id          BIGSERIAL PRIMARY KEY,
    location_id INT REFERENCES locations(id) DEFAULT 1,
    mac_address MACADDR NOT NULL,
    ip_address  INET NOT NULL,
    hostname    VARCHAR(200),
    user_id     INT REFERENCES users(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ
);

-- Ключевой индекс: поиск user_id по IP + времени (для обогащения потоков)
CREATE INDEX IF NOT EXISTS idx_leases_ip_time
    ON dhcp_leases (ip_address, assigned_at DESC, expires_at);
CREATE INDEX IF NOT EXISTS idx_leases_mac
    ON dhcp_leases (mac_address);

-- ─── Алерты ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
    id          BIGSERIAL PRIMARY KEY,
    location_id INT REFERENCES locations(id) DEFAULT 1,
    user_id     INT REFERENCES users(id),
    alert_type  VARCHAR(50) NOT NULL,  -- 'traffic_spike', 'blocked_domain', etc.
    severity    VARCHAR(20)  DEFAULT 'info',  -- info, warning, critical
    message     TEXT,
    data        JSONB,
    acknowledged BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_location_ts ON alerts(location_id, created_at DESC);
