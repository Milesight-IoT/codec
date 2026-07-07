function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || fPort !== 2 || bytes.length < 4) return out;
    out.battery_voltage = ((bytes[0] << 8) | bytes[1]) / 1000;
    out.sound_key = ((bytes[2] >> 1) & 0x01);
    out.sound_ack = (bytes[2] & 0x01);
    out.alarm = (bytes[3] & 0x01);
    out.button_1 = ((bytes[3] >> 1) & 0x01);
    out.button_2 = ((bytes[3] >> 2) & 0x01);
    out.button_3 = ((bytes[3] >> 3) & 0x01);
    out.button_4 = ((bytes[3] >> 4) & 0x01);
    out.button_5 = ((bytes[3] >> 5) & 0x01);
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
