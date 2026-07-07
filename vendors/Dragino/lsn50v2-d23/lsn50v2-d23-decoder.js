function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || fPort !== 2 || bytes.length < 11) return out;
    var mode = (bytes[6] & 0x7c) >> 2;
    if (mode === 3) {
        out.mode = 'DS18B20';
        out.battery_voltage = ((bytes[0] << 8) | bytes[1]) / 1000;
        if (!(bytes[2] === 0xff && bytes[3] === 0xff)) {
            out.external_temperature1 = parseFloat(((((bytes[2] << 24) >> 16) | bytes[3]) / 10).toFixed(1));
        }
        if (!(bytes[7] === 0xff && bytes[8] === 0xff)) {
            out.external_temperature2 = parseFloat(((((bytes[7] << 24) >> 16) | bytes[8]) / 10).toFixed(1));
        }
        if (!(bytes[9] === 0xff && bytes[10] === 0xff)) {
            out.external_temperature3 = parseFloat(((((bytes[9] << 24) >> 16) | bytes[10]) / 10).toFixed(1));
        }
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
