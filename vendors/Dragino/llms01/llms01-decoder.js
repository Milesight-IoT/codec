function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || fPort !== 2 || bytes.length < 9) return out;
    out.battery_voltage = (((bytes[0] << 8) | bytes[1]) & 0x3FFF) / 1000;
    var t = (bytes[2] << 8) | bytes[3];
    if (bytes[2] & 0x80) t |= 0xFFFF0000;
    out.external_temperature = parseFloat((t / 10).toFixed(2));
    out.leaf_moisture = parseFloat((((bytes[4] << 8) | bytes[5]) / 10).toFixed(2));
    var lt = (bytes[6] << 8) | bytes[7];
    if (lt & 0x8000) lt = lt - 0x10000;
    out.leaf_temperature = parseFloat((lt / 10).toFixed(2));
    out.interrupt = !!bytes[8];
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
