function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || bytes.length < 11 || fPort !== 2) return out;
    out.battery_voltage = ((bytes[0] << 8) | bytes[1]) / 1000;
    out.temperature = parseFloat(((((bytes[2] << 24) >> 16) | bytes[3]) / 10).toFixed(1));
    out.humidity = parseFloat((((bytes[4] << 8) | bytes[5]) / 10).toFixed(1));
    out.air_pressure = parseFloat((((bytes[6] << 8) | bytes[7]) / 10).toFixed(1));
    out.co2 = (bytes[8] << 8) | bytes[9];
    out.temp_low_alarm = !!(bytes[10] & 0x08);
    out.temp_high_alarm = !!(bytes[10] & 0x04);
    out.co2_low_alarm = !!(bytes[10] & 0x02);
    out.co2_high_alarm = !!(bytes[10] & 0x01);
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
