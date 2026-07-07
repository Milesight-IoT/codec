function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || fPort !== 2 || bytes.length < 10) return out;
    out.battery_voltage = (((bytes[0] << 8) | bytes[1]) & 0x3FFF) / 1000;
    out.soil_moisture = parseFloat((((bytes[4] << 8) | bytes[5]) / 100).toFixed(2));
    var st = (bytes[6] << 8) | bytes[7];
    if (st & 0x8000) st = st - 0x10000;
    out.soil_temperature = parseFloat((st / 100).toFixed(2));
    out.soil_conductivity = (bytes[8] << 8) | bytes[9];
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
