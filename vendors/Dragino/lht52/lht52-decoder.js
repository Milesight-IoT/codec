function _decode(bytes, fPort) {
    var out = {};
    if (!bytes) return out;
    if (fPort === 2 && bytes.length === 11) {
        out.temperature = parseFloat(((((bytes[0] << 24) >> 16) | bytes[1]) / 100).toFixed(2));
        out.humidity = parseFloat(((((bytes[2] << 24) >> 16) | bytes[3]) / 10).toFixed(1));
        out.external_temperature = parseFloat(((((bytes[4] << 24) >> 16) | bytes[5]) / 100).toFixed(2));
    } else if (fPort === 5 && bytes.length >= 7) {
        out.battery_voltage = (((bytes[5] << 8) | bytes[6])) / 1000;
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
