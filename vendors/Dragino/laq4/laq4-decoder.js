function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || bytes.length < 11 || fPort !== 2) return out;
    var mode = (bytes[2] & 0x7c) >> 2;
    out.battery_voltage = ((bytes[0] << 8) | bytes[1]) / 1000;
    if (mode === 1) {
        out.mode = 'CO2';
        out.alarm = !!(bytes[2] & 0x01);
        out.tvoc = (bytes[3] << 8) | bytes[4];
        out.co2 = (bytes[5] << 8) | bytes[6];
        out.temperature = parseFloat(((((bytes[7] << 24) >> 16) | bytes[8]) / 10).toFixed(2));
        out.humidity = parseFloat((((bytes[9] << 8) | bytes[10]) / 10).toFixed(1));
    } else if (mode === 31) {
        out.mode = 'ALARM';
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
