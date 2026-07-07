function _decode(bytes, fPort) {
    var out = {};
    if (!bytes) return out;
    if (fPort === 2 && bytes.length >= 10) {
        out.battery_voltage = ((bytes[0] << 8) | bytes[1]) / 1000;
        out.distance = (bytes[3] << 8) | bytes[4];
        out.distance_state = bytes[5];
        var mod = (bytes[2] >> 6) & 0x03;
        out.mod = mod;
        out.alarm = !!((bytes[2] >> 5) & 0x01);
        out.interrupt = !!((bytes[2] >> 4) & 0x01);
        out.interrupt_count = ((bytes[6] << 24) | (bytes[7] << 16) | (bytes[8] << 8) | bytes[9]) >>> 0;
    } else if (fPort === 5 && bytes.length >= 8) {
        out.battery_voltage = ((bytes[6] << 8) | bytes[7]) / 1000;
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
