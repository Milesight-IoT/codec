function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || fPort !== 2 || bytes.length < 11) return out;
    var flag = (bytes[0] & 0xfc) >> 2;
    out.alarm_triggered = (bytes[0] & 0x02) ? 1 : 0;
    var pulse = ((bytes[1] << 24) | (bytes[2] << 16) | (bytes[3] << 8) | bytes[4]) >>> 0;
    var divisor = (flag === 2) ? 60 : (flag === 1) ? 360 : 450;
    out.water_flow_value = parseFloat((pulse / divisor).toFixed(1));
    if (bytes[5] === 0x01) out.last_pulse = pulse;
    else out.total_pulse = pulse;
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
