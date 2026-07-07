function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || fPort !== 2 || bytes.length < 8) return out;
    out.battery_voltage = ((bytes[0] << 8) | bytes[1]) / 1000;
    out.sound_key = ((bytes[2] >> 1) & 0x01);
    out.sound_ack = (bytes[2] & 0x01);
    out.alarm = (bytes[3] & 0x01);
    out.temperature = parseFloat(((((bytes[4] << 24) >> 16) | bytes[5]) / 10).toFixed(1));
    out.humidity = parseFloat((((bytes[6] << 8) | bytes[7]) / 10).toFixed(1));
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
