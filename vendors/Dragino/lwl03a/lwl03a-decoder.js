function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || fPort !== 2 || bytes.length < 11) return out;
    out.alarm = (bytes[0] & 0x02) ? 1 : 0;
    out.water_leak_detected = (bytes[0] & 0x01) ? 1 : 0;
    out.water_leak_count = (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
    out.water_last_leak_duration = (bytes[4] << 16) | (bytes[5] << 8) | bytes[6];
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
