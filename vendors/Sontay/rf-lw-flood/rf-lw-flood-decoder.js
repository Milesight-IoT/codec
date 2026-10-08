// Source: Sontay RF-LW-WD-FLOOD (LoRaWAN Water Leak Flood Detection) user guide + MClimate Flood Sensor LoRaWAN (MC-LW-Flood) communication protocol
// Sontay product page: https://www.sontay.com/en-gb/products/smart-devices/lorawan/rf-lw-wd-flood-lorawan-flood-sensor/
// MClimate docs: https://docs.mclimate.eu/mclimate-lorawan-devices/devices/mclimate-flood-sensor-lorawan/flood-sensor-lorawan-communication-protocol/keep-alive.md
// Uplinks: 3-byte keep-alive/status (byte0 bits7:5 = 0 keep-alive, 2 flood, 4 tamper; bits 4/2/0 reserved),
//          command responses 12 keep-alive period / 09 flood event send time / 06 alarm duration / 14 flood event uplink type,
//          optionally followed by a 3-byte keep-alive in the same uplink (per docs, responses ride with the next keep-alive)
function _parseKeepalive(bytes, i) {
    // byte0 bits7:5 = packet type (0 keep-alive, 2 flood, 4 tamper); bits 4/2/0 are reserved and stay 0 in real keep-alives
    var b0 = bytes[i];
    var t = (b0 >> 5) & 0x07;
    if (!(t === 0 || t === 2 || t === 4) || (b0 & 0x15) !== 0) return null;
    var o = {};
    o.event_type = t;
    o.flood_detected = ((b0 >> 1) & 0x01) === 1 ? 1 : 0;
    o.box_tamper = ((b0 >> 3) & 0x01) === 1 ? 1 : 0;
    o.battery_voltage = (bytes[i + 1] * 16) / 1000;
    var tc = bytes[i + 2] & 0x7F;
    o.temperature = (bytes[i + 2] & 0x80) ? -tc : tc;
    return o;
}

function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || !bytes.length) return out;
    var hex = '';
    for (var i = 0; i < bytes.length; i++) hex += ('0' + bytes[i].toString(16).toUpperCase()).slice(-2);
    out.raw_uplink = hex;
    if (bytes.length === 3) {
        var k = _parseKeepalive(bytes, 0);
        if (k) {
            for (var key in k) out[key] = k[key];
            return out;
        }
    }
    // command responses (docs note they ride together with the next keep-alive)
    var cmd = bytes[0];
    var tail = 0;
    if (cmd === 0x12 && bytes.length >= 3) {
        out.keepalive_period = (bytes[1] << 8) | bytes[2];
        tail = 3;
    } else if (cmd === 0x09 && bytes.length >= 2) {
        out.flood_event_send_time = bytes[1];
        tail = 2;
    } else if (cmd === 0x06 && bytes.length >= 2) {
        out.alarm_duration = bytes[1] * 10;
        tail = 2;
    } else if (cmd === 0x14 && bytes.length >= 2) {
        out.flood_event_confirmed = bytes[1] === 1 ? 1 : 0;
        tail = 2;
    } else {
        return out;
    }
    if (bytes.length >= tail + 3) {
        var k2 = _parseKeepalive(bytes, tail);
        if (k2) for (var key2 in k2) out[key2] = k2[key2];
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
