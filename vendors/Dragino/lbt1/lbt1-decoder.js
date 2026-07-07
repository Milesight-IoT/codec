function _ascii(bytes, s, e) {
    var r = '';
    for (var i = s; i < e; i++) r += String.fromCharCode(bytes[i]);
    return r;
}

function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || fPort !== 2 || bytes.length < 6) return out;
    out.battery_voltage = ((bytes[0] << 8) | bytes[1]) / 1000;
    out.alarm_triggered = !!((bytes[2] >> 4) & 0x0f);
    out.steps_count = (((bytes[2] & 0x0f) << 16) | (bytes[3] << 8) | bytes[4]) >>> 0;
    var mode = bytes[5];
    out.beacon_address = '';
    out.beacon_major = 1;
    out.beacon_minor = 1;
    out.beacon_rssi = 0;
    out.beacon_uuid = '';
    if (mode === 1 && bytes.length >= 11) {
        out.beacon_uuid = _ascii(bytes, 6, 11);
    } else if (mode === 2 && bytes.length >= 50) {
        out.beacon_address = _ascii(bytes, 38, 50);
        out.beacon_uuid = _ascii(bytes, 6, 38);
    } else if (mode === 3 && bytes.length >= 32) {
        out.beacon_uuid = _ascii(bytes, 6, 18);
        out.beacon_major = parseInt(_ascii(bytes, 18, 22), 16);
        out.beacon_minor = parseInt(_ascii(bytes, 22, 26), 16);
        out.beacon_rssi = parseInt(_ascii(bytes, 28, 32));
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
