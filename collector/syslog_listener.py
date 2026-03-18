import asyncio, logging, re, time
log = logging.getLogger("syslog")

# RouterOS v7: "dns query from 192.168.1.5: #12345 google.com. A"
RE_DNS_QUERY = re.compile(r"dns query from ([\d.]+):\s+#\d+\s+([\w.\-]+)\.", re.I)

# Fallback форматы
RE_DNS_OLD   = re.compile(r"dns\s+query\s+from\s+([\d.]+)\s+for\s+([\w.\-]+)", re.I)
RE_DNS_MANGLE= re.compile(r"DNS:.*?([\d.]+):\d+.*?query\s+([\w.\-]+)", re.I)

# DHCP
RE_DHCP_ASSIGN = re.compile(
    r"(?:dhcp\S*)\s+assigned\s+([\d.]+)\s+for\s+([\dA-Fa-f:]{17})(?:\s+\(([^)]*)\))?", re.I)
RE_DHCP_EXPIRE = re.compile(
    r"(?:dhcp\S*)\s+(?:deassigned|lease expired)\s+([\d.]+)\s+for\s+([\dA-Fa-f:]{17})", re.I)

SKIP_SUFFIXES = (
    ".compute.amazonaws.com", ".compute.internal", ".ec2.internal",
    ".in-addr.arpa", ".ip6.arpa", ".m.ringcentral.com",
)

def is_valid(domain: str) -> bool:
    d = domain.lower().rstrip(".")
    if not d or len(d) < 4: return False
    for s in SKIP_SUFFIXES:
        if d.endswith(s): return False
    parts = d.split(".")
    if parts[0].replace("-","").isdigit(): return False
    skip = {"local","localhost","localdomain","lan","home","corp","internal"}
    if parts[-1] in skip: return False
    return len(parts) >= 2 and len(parts[-1]) >= 2 and parts[-1].isalpha()

def is_local(ip: str) -> bool:
    return ip.startswith("192.168.") or ip.startswith("10.") or ip.startswith("172.")

class SyslogProtocol(asyncio.DatagramProtocol):
    def __init__(self, cb):
        self._cb = cb
    def connection_made(self, t):
        log.info("Syslog listener ready on UDP :514")
    def datagram_received(self, data, addr):
        try:
            msg = data.decode("utf-8", errors="replace").strip()
            asyncio.ensure_future(self._cb(msg, addr[0]))
        except Exception as e:
            log.debug("Syslog error: %s", e)
    def error_received(self, exc):
        log.warning("Syslog socket error: %s", exc)

class SyslogListener:
    def __init__(self, enrichment, writer):
        self._e = enrichment
        self._w = writer

    async def start(self):
        loop = asyncio.get_running_loop()
        transport, _ = await loop.create_datagram_endpoint(
            lambda: SyslogProtocol(self._handle),
            local_addr=("0.0.0.0", 514),
        )
        try:
            await asyncio.sleep(float("inf"))
        finally:
            transport.close()

    async def _handle(self, msg: str, router_ip: str):
        now = int(time.time())

        # ── DNS: RouterOS v7 формат ─────────────────────────────
        m = RE_DNS_QUERY.search(msg)
        if m:
            src_ip = m.group(1)
            domain = m.group(2).rstrip(".")
            if is_local(src_ip) and is_valid(domain):
                await self._e.cache_dns(src_ip, domain)
                await self._w.add_dns_log({"ts": now, "src_ip": src_ip, "domain": domain, "qtype": "A"})
                log.info("DNS: %s → %s", src_ip, domain)
            return

        # ── DNS: старые форматы ─────────────────────────────────
        m = RE_DNS_OLD.search(msg) or RE_DNS_MANGLE.search(msg)
        if m:
            src_ip = m.group(1)
            domain = m.group(2).rstrip(".")
            if is_local(src_ip) and is_valid(domain):
                await self._e.cache_dns(src_ip, domain)
                await self._w.add_dns_log({"ts": now, "src_ip": src_ip, "domain": domain, "qtype": "A"})
                log.info("DNS(old): %s → %s", src_ip, domain)
            return

        # ── DHCP ────────────────────────────────────────────────
        m = RE_DHCP_ASSIGN.search(msg)
        if m:
            ip, mac = m.group(1), m.group(2).lower()
            hostname = m.group(3) or ""
            await self._e.register_lease(ip, mac, hostname)
            log.info("DHCP: %s → %s (%s)", mac, ip, hostname)
            return

        m = RE_DHCP_EXPIRE.search(msg)
        if m:
            await self._e.expire_lease(m.group(1), m.group(2).lower())

# DEBUG PATCH
_orig_handle = SyslogListener._handle
async def _debug_handle(self, msg, router_ip):
    if 'query' in msg.lower() and '192.168' in msg:
        log.info("RAW_DNS: %s", repr(msg[:150]))
    await _orig_handle(self, msg, router_ip)
SyslogListener._handle = _debug_handle
