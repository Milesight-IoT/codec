function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || bytes.length < 11) return out;
    if (fPort === 2) {
        out.battery_voltage = ((bytes[0] << 8) | bytes[1]) / 1000;
        if (!(bytes[2] === 0xff && bytes[3] === 0xff)) {
            out.temperature_red = parseFloat(((((bytes[2] << 24) >> 16) | bytes[3]) / 10).toFixed(1));
        }
    } else if (fPort === 5 && bytes.length >= 7) {
        out.battery_voltage = ((bytes[5] << 8) | bytes[6]) / 1000;
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
