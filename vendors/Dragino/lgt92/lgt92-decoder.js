var _MD = ['Disable', 'Move', 'Collide', 'User'];

function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || fPort !== 2 || bytes.length < 11) return out;
    out.latitude = (((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >> 0) / 1000000;
    out.longitude = (((bytes[4] << 24) | (bytes[5] << 16) | (bytes[6] << 8) | bytes[7]) >> 0) / 1000000;
    out.alarm = !!(bytes[8] & 0x40);
    out.battery_voltage = (((bytes[8] & 0x3f) << 8) | bytes[9]) / 1000;
    out.motion_mode = _MD[bytes[10] >> 6];
    out.led_activity = !!(bytes[10] & 0x20);
    out.firmware = 160 + (bytes[10] & 0x1f);
    if (bytes.length >= 15) {
        out.roll = parseFloat((((((bytes[11] << 24) >> 16) | bytes[12]) / 100)).toFixed(2));
        out.pitch = parseFloat((((((bytes[13] << 24) >> 16) | bytes[14]) / 100)).toFixed(2));
    }
    if (bytes.length >= 18) {
        out.hdop = bytes[15] / 100;
        out.altitude = parseFloat(((((bytes[16] << 24) >> 16) | bytes[17]) / 100).toFixed(2));
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
