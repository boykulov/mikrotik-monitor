# NebulaNet — MikroTik RouterOS v7 Configuration
# Replace COLLECTOR_IP with your server IP

:local collectorIP "COLLECTOR_IP"

# ── Traffic Flow (NetFlow v9) ──────────────────────────────────────────────
/ip traffic-flow
set enabled=yes interfaces=all
set active-flow-timeout=1m
set inactive-flow-timeout=15s

/ip traffic-flow target
add dst-address=$collectorIP port=2055 version=9

# ── DNS Logging ───────────────────────────────────────────────────────────
/ip dns
set allow-remote-requests=yes

/system logging action
set 0 name=remote target=remote remote=$collectorIP remote-port=514 bsd-syslog=no

/system logging
add topics=dns    action=remote
add topics=dhcp   action=remote
add topics=system action=remote

# ── Force DNS through MikroTik (block DoH/DoT) ───────────────────────────
/ip firewall filter
add chain=forward dst-port=853 protocol=tcp action=drop comment="Block DoT"
add chain=forward dst-port=853 protocol=udp action=drop comment="Block DoT UDP"

/ip firewall nat
add chain=dstnat dst-port=53 protocol=udp action=redirect to-ports=53 comment="Force DNS"
add chain=dstnat dst-port=53 protocol=tcp action=redirect to-ports=53 comment="Force DNS TCP"

# ── Verify ────────────────────────────────────────────────────────────────
/ip traffic-flow print
/ip traffic-flow target print
/system logging print where action=remote
