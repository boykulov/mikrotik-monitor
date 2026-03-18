"""
MikroTik DNS Cache Poller v2
Читает активные соединения и сопоставляет dst IP с DNS кэшем (A/AAAA записи)
Это даёт реальные домены которые пользователь открывал в браузере
"""
import time, os, logging, urllib.request, urllib.parse
from librouteros import connect

logging.basicConfig(level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
log = logging.getLogger("mt-poller")

MT_HOST  = os.getenv("MT_HOST",   "192.168.1.200")
MT_PORT  = int(os.getenv("MT_PORT", "8728"))
MT_USER  = os.getenv("MT_USER",   "nebulanet")
MT_PASS  = os.getenv("MT_PASS",   "Nebula2026!")
CH_HOST  = os.getenv("CLICKHOUSE_HOST", "localhost")
CH_PORT  = int(os.getenv("CLICKHOUSE_PORT", "8123"))
CH_DB    = os.getenv("CLICKHOUSE_DB",   "nebulanet")
CH_USER  = os.getenv("CLICKHOUSE_USER", "nebulanet")
CH_PASS  = os.getenv("CLICKHOUSE_PASSWORD", "nebulanet_secret")
INTERVAL = int(os.getenv("POLL_INTERVAL", "15"))
LOCATION = int(os.getenv("LOCATION_ID",   "1"))

def ch_insert(rows):
    if not rows: return
    q = urllib.parse.urlencode({
        "database": CH_DB, "user": CH_USER, "password": CH_PASS,
        "query": "INSERT INTO dns_log (ts,location_id,src_ip,domain,qtype) FORMAT TabSeparated"
    })
    body = "\n".join(
        f"{r['ts']}\t{LOCATION}\t{r['ip']}\t{r['domain']}\tA"
        for r in rows
    ).encode()
    try:
        req = urllib.request.Request(
            f"http://{CH_HOST}:{CH_PORT}/?{q}", data=body, method="POST")
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp.read()
        log.info("Inserted %d DNS records", len(rows))
    except Exception as e:
        log.error("CH insert error: %s", e)

# Домены которые нужно игнорировать (технические / обратные DNS)
SKIP_SUFFIXES = (
    ".compute.amazonaws.com",
    ".compute.internal",
    ".ec2.internal",
    ".cloudapp.azure.com",
    ".in-addr.arpa",
    ".ip6.arpa",
    ".m.ringcentral.com",   # SIP серверы с IP в имени
    ".m.glip.com",
)

def is_useful_domain(name: str) -> bool:
    """Оставляем только домены которые пользователь реально вводил."""
    n = name.lower().rstrip(".")
    if not n or len(n) < 4:
        return False
    # Пропускаем PTR-like домены с IP в имени
    for skip in SKIP_SUFFIXES:
        if n.endswith(skip):
            return False
    # Пропускаем если начинается с IP-подобного паттерна
    parts = n.split(".")
    if parts and parts[0].replace("-","").isdigit():
        return False
    # Нужен минимум домен второго уровня
    if len(parts) < 2 or len(parts[-1]) < 2:
        return False
    return True

def poll():
    api = connect(host=MT_HOST, port=MT_PORT,
                  username=MT_USER, password=MT_PASS)

    now = int(time.time())

    # 1. Строим карту: resolved_ip → domain (только A/AAAA записи)
    ip_to_domain = {}
    domain_count = 0
    for entry in api("/ip/dns/cache/print"):
        name = entry.get("name", "").rstrip(".")
        data = entry.get("data", "")  # resolved IP
        typ  = entry.get("type", "")

        if typ not in ("A", "AAAA") or not data or not name:
            continue
        if not is_useful_domain(name):
            continue

        # Для одного IP может быть несколько доменов (CDN)
        # Берём самый короткий (корневой) домен
        existing = ip_to_domain.get(data)
        if not existing or len(name) < len(existing):
            ip_to_domain[data] = name
        domain_count += 1

    log.info("DNS cache: %d useful A-records → %d unique IPs", domain_count, len(ip_to_domain))

    # 2. Читаем ARP таблицу: mac → ip для локальных устройств
    arp_ip_set = set()
    for entry in api("/ip/arp/print"):
        ip_addr = entry.get("address", "")
        if ip_addr.startswith("192.168.") or ip_addr.startswith("10."):
            arp_ip_set.add(ip_addr)

    # 3. Читаем активные соединения
    rows = []
    seen = set()

    for conn in api("/ip/firewall/connection/print"):
        src_raw = conn.get("src-address", "")
        dst_raw = conn.get("dst-address", "")
        src_ip = src_raw.split(":")[0]
        dst_ip = dst_raw.split(":")[0]

        # Только локальные клиенты
        if not (src_ip.startswith("192.168.") or src_ip.startswith("10.")):
            continue

        domain = ip_to_domain.get(dst_ip)
        if not domain:
            continue

        key = (src_ip, domain)
        if key in seen:
            continue
        seen.add(key)
        rows.append({"ts": now, "ip": src_ip, "domain": domain})

    # 4. Дополнительно: для каждого устройства в ARP добавляем домены
    #    из DNS кэша которые они недавно запрашивали (через connection tracking)
    log.info("Connection matches: %d records for %d unique (ip,domain) pairs",
             len(rows), len(seen))

    if rows:
        ch_insert(rows)

    api.close()
    return len(rows)

def main():
    log.info("MikroTik DNS Poller v2 starting (interval=%ds)", INTERVAL)
    while True:
        try:
            count = poll()
            log.info("Poll done: %d records", count)
        except Exception as e:
            log.error("Poll error: %s", e)
        time.sleep(INTERVAL)

if __name__ == "__main__":
    main()
