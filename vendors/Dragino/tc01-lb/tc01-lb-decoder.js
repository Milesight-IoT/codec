function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || fPort !== 2 || bytes.length < 10) return out;
    out.battery_voltage = ((bytes[0] << 8) | bytes[1]) / 1000;
    out.thermocouple_type = bytes[2];
    out.temperature = parseFloat(((((bytes[3] << 24) >> 16) | bytes[4]) / 10).toFixed(2));
    out.interrupt = (bytes[5] & 0x01) ? 1 : 0;
    out.temp_high_alarm = (bytes[5] & 0x04) ? 1 : 0;
    out.temp_low_alarm = (bytes[5] & 0x08) ? 1 : 0;
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
