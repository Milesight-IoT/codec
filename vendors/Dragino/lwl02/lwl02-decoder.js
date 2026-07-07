function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || fPort !== 10 || bytes.length < 10) return out;
    var mod = bytes[2];
    if (mod !== 2) return out;
    out.battery_voltage = (((bytes[0] << 8) | bytes[1]) & 0x3fff) / 1000;
    out.water_leak_detected = (bytes[0] & 0x40) ? 1 : 0;
    out.water_leak_count = (bytes[3] << 16) | (bytes[4] << 8) | bytes[5];
    out.water_last_leak_duration = (bytes[6] << 16) | (bytes[7] << 8) | bytes[8];
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
