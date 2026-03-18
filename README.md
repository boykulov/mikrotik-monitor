# NebulaNet — Traffic Monitoring Stack

## Quick Start

```bash
# 1. Clone / copy files to your server
git clone ... && cd nebulanet

# 2. Run setup
./scripts/setup.sh

# 3. Open API docs
http://YOUR_SERVER_IP:8000/docs
```

## Services & Ports

| Service    | Port          | Purpose                     |
|------------|---------------|-----------------------------|
| API        | 8000 TCP      | REST API + Swagger UI        |
| Collector  | 2055 UDP      | NetFlow v9 from MikroTik     |
| Collector  | 514 UDP       | Syslog (DNS + DHCP)          |
| ClickHouse | 8123/9000 TCP | Analytics DB (internal)      |
| PostgreSQL | 5432 TCP      | Metadata DB (internal)       |
| Redis      | 6379 TCP      | Cache / IP→User (internal)   |

## MikroTik Setup

1. Open `scripts/mikrotik_config.rsc`
2. Replace `COLLECTOR_IP` with your server IP
3. Paste into MikroTik Terminal or run via SSH:
   ```
   ssh admin@MIKROTIK_IP "/import mikrotik_config.rsc"
   ```

## API Endpoints

| Method | Path                          | Description                  |
|--------|-------------------------------|------------------------------|
| GET    | /health                       | Health check                 |
| GET    | /reports/top-users            | Top users by traffic         |
| GET    | /reports/top-domains          | Top visited domains          |
| GET    | /reports/user/{id}/domains    | User → domains detail        |
| GET    | /reports/hourly               | Hourly traffic chart         |
| GET    | /reports/live                 | Live stats (last 5 min)      |
| GET    | /devices                      | All registered devices       |
| POST   | /devices/assign               | Assign device to user        |
| GET    | /users                        | List users                   |
| POST   | /users                        | Create user                  |

### Query parameters (all reports)
- `date_from` — YYYY-MM-DD (default: 7 days ago)
- `date_to`   — YYYY-MM-DD (default: today)
- `location_id` — int (default: 1)

## How IP → User mapping works

```
MikroTik DHCP syslog → Collector → Redis (ip→user_id, TTL 24h)
                                 → PostgreSQL dhcp_leases table

NetFlow (src_ip) → Redis lookup → user_id attached to every flow
```

## Register users

After setup, register users so IPs get proper names in reports:

```bash
# Create a user
curl -X POST http://SERVER:8000/users \
  -H "Content-Type: application/json" \
  -d '{"username":"ivan","full_name":"Ivan Petrov","department":"IT"}'

# Assign a device (MAC) to user
curl -X POST http://SERVER:8000/devices/assign \
  -H "Content-Type: application/json" \
  -d '{"mac_address":"aa:bb:cc:dd:ee:ff","user_id":1}'
```

## Logs

```bash
docker compose logs -f collector   # NetFlow + syslog parser
docker compose logs -f api         # REST API
docker compose logs -f clickhouse  # DB
```

## Production checklist

- [ ] Set strong passwords in `.env`
- [ ] Put API behind Nginx + SSL
- [ ] Restrict ClickHouse/Postgres ports (don't expose to internet)
- [ ] Set up log rotation for Docker
- [ ] Schedule daily ClickHouse backup: `clickhouse-client --query "BACKUP TABLE flows TO Disk('backups', 'flows.bak')"`
