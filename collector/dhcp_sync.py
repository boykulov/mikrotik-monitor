"""Периодическая синхронизация DHCP leases из MikroTik в PostgreSQL"""
import time, os, logging, psycopg2
from librouteros import connect

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("dhcp-sync")

while True:
    try:
        api = connect(host=os.getenv('MT_HOST','192.168.1.200'),
                      port=int(os.getenv('MT_PORT','8728')),
                      username=os.getenv('MT_USER','nebulanet'),
                      password=os.getenv('MT_PASS','Nebula2026!'))
        pg  = psycopg2.connect(os.getenv('POSTGRES_DSN',
              'postgresql://nebulanet:nebulanet_secret@localhost:5432/nebulanet'))
        cur = pg.cursor()
        n = 0
        for l in api('/ip/dhcp-server/lease/print'):
            ip  = l.get('address','')
            mac = l.get('mac-address','').lower()
            hn  = l.get('host-name','') or l.get('comment','') or ''
            if not ip or not mac: continue
            cur.execute("""
                INSERT INTO devices (mac_address,ip_current,hostname,last_seen,location_id)
                VALUES (%s,%s,%s,NOW(),1)
                ON CONFLICT (mac_address) DO UPDATE
                  SET ip_current=EXCLUDED.ip_current,
                      hostname=CASE WHEN EXCLUDED.hostname!='' THEN EXCLUDED.hostname ELSE devices.hostname END,
                      last_seen=NOW()
            """, (mac, ip, hn)); n += 1
        pg.commit(); cur.close(); pg.close(); api.close()
        log.info("Synced %d leases", n)
    except Exception as e:
        log.error("Error: %s", e)
    time.sleep(60)
