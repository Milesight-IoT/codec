function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || fPort !== 2 || bytes.length < 15) return out;
    out.latitude = (((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) | 0) / 1000000;
    out.longitude = (((bytes[4] << 24) | (bytes[5] << 16) | (bytes[6] << 8) | bytes[7]) | 0) / 1000000;
    out.battery_voltage = (((bytes[8] & 0x3f) << 8) | bytes[9]) / 1000;
    out.alarm_raised = (bytes[8] & 0x40) ? 1 : 0;
    var mod = (bytes[10] & 0xc0) >> 6;
    out.positioning_mode = mod === 1 ? 'WIFI' : mod === 2 ? 'BLE' : 'GPS';
    out.location = out.latitude + ',' + out.longitude;
    if (mod !== 1) {
        out.humidity = ((bytes[11] << 8) | bytes[12]) / 10;
        out.temperature = ((bytes[13] << 8) | bytes[14]) / 10;
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
