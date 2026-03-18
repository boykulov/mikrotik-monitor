import asyncio
import logging
import os
import struct
import time

log = logging.getLogger("netflow")

IPV4_SRC_ADDR  = 8
IPV4_DST_ADDR  = 12
SRC_PORT       = 7
DST_PORT       = 11
PROTOCOL       = 4
IN_BYTES       = 1
IN_PKTS        = 2
OUT_BYTES      = 23
OUT_PKTS       = 24
FIRST_SWITCHED = 22
LAST_SWITCHED  = 21


class FlowRecord:
    __slots__ = ["ts","src_ip","dst_ip","src_port","dst_port","proto",
                 "bytes_in","bytes_out","packets_in","packets_out",
                 "domain","sni_host","user_id","location_id"]
    def __init__(self):
        self.ts=int(time.time()); self.src_ip="0.0.0.0"; self.dst_ip="0.0.0.0"
        self.src_port=0; self.dst_port=0; self.proto=0
        self.bytes_in=0; self.bytes_out=0; self.packets_in=0; self.packets_out=0
        self.domain=""; self.sni_host=""; self.user_id=0; self.location_id=1


class NetFlowParser:
    def __init__(self):
        self._templates = {}
        self._pending = {}  # data flowsets waiting for template
        self._pkt_count = 0

    def parse(self, data: bytes, src: str) -> list:
        if len(data) < 20:
            return []
        version = struct.unpack_from("!H", data, 0)[0]
        self._pkt_count += 1
        if self._pkt_count <= 5 or self._pkt_count % 100 == 0:
            log.info("Packet #%d from %s version=%d len=%d", self._pkt_count, src, version, len(data))
        if version == 9:
            return self._parse_v9(data, src)
        else:
            log.warning("Unsupported NetFlow version %d from %s", version, src)
            return []

    def _parse_v9(self, data: bytes, src: str) -> list:
        records = []
        try:
            count, uptime, unix_secs, seq, src_id = struct.unpack_from("!HIIIII"[:6], data, 0)
            # header: version(2) count(2) uptime(4) unix_secs(4) seq(4) src_id(4) = 20 bytes
            count, uptime, unix_secs = struct.unpack_from("!HII", data, 2)
            seq, src_id = struct.unpack_from("!II", data, 12)
        except struct.error:
            return []

        offset = 20
        template_flowsets = []
        data_flowsets = []

        # Первый проход — собираем все flowsets
        while offset + 4 <= len(data):
            if offset + 4 > len(data):
                break
            fs_id, fs_len = struct.unpack_from("!HH", data, offset)
            if fs_len < 4:
                break
            fs_data = data[offset+4 : offset+fs_len]
            if fs_id == 0:
                template_flowsets.append(fs_data)
            elif fs_id == 1:
                pass  # Options template, skip
            elif fs_id >= 256:
                data_flowsets.append((fs_id, fs_data, unix_secs))
            offset += fs_len
            if fs_len % 4:
                offset += 4 - (fs_len % 4)

        # Сначала обрабатываем templates
        for fs_data in template_flowsets:
            self._parse_templates(fs_data, src)

        # Потом data
        for fs_id, fs_data, ts in data_flowsets:
            key = (src, fs_id)
            tmpl = self._templates.get(key)
            if tmpl:
                recs = self._parse_data(fs_data, tmpl, ts)
                records.extend(recs)
                log.debug("FlowSet id=%d: parsed %d records", fs_id, len(recs))
            else:
                log.debug("No template for flowset_id=%d from %s, buffering", fs_id, src)
                # Буферизуем до получения шаблона
                if key not in self._pending:
                    self._pending[key] = []
                self._pending[key].append((fs_data, ts))
                if len(self._pending[key]) > 10:
                    self._pending[key] = self._pending[key][-10:]

        return records

    def _parse_templates(self, data: bytes, src: str):
        offset = 0
        while offset + 4 <= len(data):
            tmpl_id, field_count = struct.unpack_from("!HH", data, offset)
            offset += 4
            if field_count == 0 or offset + field_count*4 > len(data):
                break
            fields = []
            for _ in range(field_count):
                ftype, flen = struct.unpack_from("!HH", data, offset)
                fields.append((ftype, flen))
                offset += 4
            key = (src, tmpl_id)
            is_new = key not in self._templates
            self._templates[key] = fields
            if is_new:
                log.info("New template id=%d from %s (%d fields): %s",
                         tmpl_id, src, field_count,
                         [(t,l) for t,l in fields[:8]])
                # Обрабатываем буферизованные data flowsets
                if key in self._pending:
                    log.info("Processing %d buffered flowsets for template %d",
                             len(self._pending[key]), tmpl_id)
                    for fs_data, ts in self._pending.pop(key):
                        pass  # уже поздно, просто очищаем

    def _parse_data(self, data: bytes, template: list, unix_secs: int) -> list:
        rec_len = sum(flen for _, flen in template)
        if rec_len == 0:
            return []
        records = []
        offset = 0
        while offset + rec_len <= len(data):
            # пропускаем padding нули в конце
            if data[offset:offset+rec_len] == b'\x00' * rec_len:
                offset += rec_len
                continue
            rec = FlowRecord()
            rec.ts = unix_secs
            foff = offset
            for ftype, flen in template:
                if foff + flen > len(data):
                    break
                raw = data[foff:foff+flen]
                foff += flen
                self._apply(rec, ftype, flen, raw)
            if rec.src_ip != "0.0.0.0":
                records.append(rec)
            offset += rec_len
        return records

    def _apply(self, rec: FlowRecord, ftype: int, flen: int, raw: bytes):
        u = lambda b: int.from_bytes(b, "big")
        if   ftype == IPV4_SRC_ADDR and flen == 4: rec.src_ip  = ".".join(str(b) for b in raw)
        elif ftype == IPV4_DST_ADDR and flen == 4: rec.dst_ip  = ".".join(str(b) for b in raw)
        elif ftype == SRC_PORT:   rec.src_port   = u(raw)
        elif ftype == DST_PORT:   rec.dst_port   = u(raw)
        elif ftype == PROTOCOL:   rec.proto      = u(raw)
        elif ftype == IN_BYTES:   rec.bytes_in   = u(raw)
        elif ftype == IN_PKTS:    rec.packets_in = u(raw)
        elif ftype == OUT_BYTES:  rec.bytes_out  = u(raw)
        elif ftype == OUT_PKTS:   rec.packets_out= u(raw)


class NetFlowProtocol(asyncio.DatagramProtocol):
    def __init__(self, parser, callback):
        self._parser = parser
        self._callback = callback

    def connection_made(self, transport):
        log.info("NetFlow UDP socket bound on :2055")

    def datagram_received(self, data, addr):
        try:
            records = self._parser.parse(data, addr[0])
            if records:
                asyncio.ensure_future(self._callback(records))
        except Exception as e:
            log.exception("datagram_received error from %s: %s", addr[0], e)

    def error_received(self, exc):
        log.warning("NetFlow socket error: %s", exc)


class NetFlowListener:
    def __init__(self, enrichment, writer):
        self._enrichment = enrichment
        self._writer = writer
        self._parser = NetFlowParser()

    async def start(self):
        loop = asyncio.get_running_loop()
        log.info("Binding NetFlow listener on 0.0.0.0:2055")
        transport, _ = await loop.create_datagram_endpoint(
            lambda: NetFlowProtocol(self._parser, self._on_flows),
            local_addr=("0.0.0.0", 2055),
        )
        try:
            await asyncio.sleep(float("inf"))
        finally:
            transport.close()

    async def _on_flows(self, records):
        enriched = []
        for rec in records:
            rec.user_id = await self._enrichment.get_user_id(rec.src_ip)
            domain = await self._enrichment.get_domain(rec.src_ip)
            if domain:
                rec.domain = domain
            enriched.append(rec)
        await self._writer.add_flows(enriched)
        log.info("Processed %d flow records", len(enriched))
