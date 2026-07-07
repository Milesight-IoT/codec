function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || fPort !== 2 || bytes.length < 11) return out;
    if (bytes[0] === 0x03 || bytes[10] === 0x02) return out;
    out.battery_voltage = (((bytes[0] << 8) | bytes[1]) & 0x3FFF) / 1000;
    var t = ((bytes[2] << 24) >> 16) | bytes[3];
    out.temperature = parseFloat((t / 10).toFixed(2));
    out.lidar_distance = ((bytes[4] << 8) | bytes[5]) / 10;
    out.lidar_signal = (bytes[6] << 8) | bytes[7];
    out.interrupt = !!bytes[8];
    out.lidar_temperature = (bytes[9] << 24) >> 24;
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
