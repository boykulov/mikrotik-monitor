-- NebulaNet PostgreSQL schema

CREATE TABLE IF NOT EXISTS locations (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO locations (id, name) VALUES (1, 'Main Office') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(100) NOT NULL UNIQUE,
    full_name   VARCHAR(200),
    email       VARCHAR(200),
    department  VARCHAR(100),
    location_id INT REFERENCES locations(id) DEFAULT 1,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
    id          BIGSERIAL PRIMARY KEY,
    mac_address MACADDR NOT NULL,
    user_id     INT REFERENCES users(id),
    hostname    VARCHAR(200),
    ip_current  INET,
    last_seen   TIMESTAMPTZ,
    location_id INT REFERENCES locations(id) DEFAULT 1,
    UNIQUE(mac_address)
);

CREATE TABLE IF NOT EXISTS dhcp_leases (
    id          BIGSERIAL PRIMARY KEY,
    mac_address MACADDR NOT NULL,
    ip_address  INET NOT NULL,
    user_id     INT REFERENCES users(id),
    hostname    VARCHAR(200),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ,
    location_id INT REFERENCES locations(id) DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_dhcp_ip_time
    ON dhcp_leases (ip_address, assigned_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_dhcp_mac
    ON dhcp_leases (mac_address);
CREATE INDEX IF NOT EXISTS idx_devices_mac
    ON devices (mac_address);

-- DNS cache table (supplement to Redis)
CREATE TABLE IF NOT EXISTS dns_cache (
    ip_address  INET PRIMARY KEY,
    domain      VARCHAR(500),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Default unknown user (user_id=0 in ClickHouse maps here)
INSERT INTO users (id, username, full_name) VALUES (0, 'unknown', 'Unknown / Unregistered')
ON CONFLICT DO NOTHING;
