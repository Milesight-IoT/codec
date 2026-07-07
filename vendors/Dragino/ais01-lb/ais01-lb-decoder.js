function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || bytes.length < 2) return out;
    if (fPort === 2 && bytes.length >= 14) {
        out.battery_voltage = ((bytes[0] << 8) | bytes[1]) / 1000;
        var integer = ((bytes[6] << 24) | (bytes[7] << 16) | (bytes[8] << 8) | bytes[9]) >>> 0;
        var decimal = ((bytes[10] << 24) | (bytes[11] << 16) | (bytes[12] << 8) | bytes[13]) >>> 0;
        var reading;
        if (decimal < 100000) reading = integer + decimal / 100000;
        else if (decimal < 1000000) reading = integer + decimal / 1000000;
        else reading = integer + decimal / 10000000;
        out.reading = reading;
    } else if (fPort === 5 && bytes.length >= 7) {
        out.battery_voltage = ((bytes[5] << 8) | bytes[6]) / 1000;
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
