function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || fPort !== 2 || bytes.length < 11) return out;
    var ext = bytes[2] & 0x0f;
    out.battery_voltage = (((bytes[0] << 8) | bytes[1]) & 0x3fff) / 1000;
    function s16(h, l) { return (((h << 24) >> 16) | l); }
    if (ext === 0x01) {
        if (!(bytes[3] === 0x80 && bytes[4] === 0x01)) {
            out.temperature1 = parseFloat((s16(bytes[3], bytes[4]) / 100).toFixed(2));
        }
        if (!(bytes[5] === 0x80 && bytes[6] === 0x01)) {
            out.temperature2 = parseFloat((s16(bytes[5], bytes[6]) / 100).toFixed(2));
        }
    } else if (ext === 0x02) {
        out.temperature1 = parseFloat((s16(bytes[3], bytes[4]) / 10).toFixed(1));
        out.temperature2 = parseFloat((s16(bytes[5], bytes[6]) / 10).toFixed(1));
    } else if (ext === 0x03) {
        out.resistance1 = parseFloat((((bytes[3] << 8) | bytes[4]) / 100).toFixed(2));
        out.resistance2 = parseFloat((((bytes[5] << 8) | bytes[6]) / 100).toFixed(2));
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
