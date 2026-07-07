function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || fPort !== 2 || bytes.length < 8) return out;
    out.battery_voltage = (((bytes[0] << 8) | bytes[1]) & 0x3FFF) / 1000;
    out.distance = (bytes[2] << 8) | bytes[3];
    out.interrupt = !!bytes[4];
    var t = (bytes[5] << 8) | bytes[6];
    if (bytes[5] & 0x80) t |= 0xFFFF0000;
    out.external_temperature = parseFloat((t / 10).toFixed(2));
    out.ultrasonic_sensor = !!bytes[7];
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
