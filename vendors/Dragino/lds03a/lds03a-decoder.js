function _decode(bytes, fPort) {
    var out = {};
    if (!bytes) return out;
    if (fPort === 2 && bytes.length >= 11) {
        out.alarm = !!(bytes[0] & 0x02);
        out.door_opened = !!(bytes[0] & 0x01);
        out.door_open_count = (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
        out.door_last_open_duration = (bytes[4] << 16) | (bytes[5] << 8) | bytes[6];
    } else if (fPort === 5 && bytes.length >= 7) {
        out.battery_voltage = ((bytes[5] << 8) | bytes[6]) / 1000;
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
