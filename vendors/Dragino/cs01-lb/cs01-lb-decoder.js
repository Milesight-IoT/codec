function _decode(bytes, fPort) {
    var out = {};
    if (!bytes) return out;
    if (fPort === 2 && bytes.length >= 11) {
        var v = ((bytes[0] << 8) | bytes[1]) & 0x3FFF;
        out.battery_voltage = v / 1000;
        out.interrupt_flag = !!(bytes[0] & 0x40);
        out.interrupt_level = (bytes[0] & 0x80) ? 'HIGH' : 'LOW';
        out.ch1_current = ((bytes[2] << 8) | bytes[3]) / 100;
        out.ch2_current = ((bytes[4] << 8) | bytes[5]) / 100;
        out.ch3_current = ((bytes[6] << 8) | bytes[7]) / 100;
        out.ch4_current = ((bytes[8] << 8) | bytes[9]) / 100;
        var f = bytes[10];
        out.ch1_low_current_alarm = !!(f & 0x80);
        out.ch1_high_current_alarm = !!(f & 0x40);
        out.ch2_low_current_alarm = !!(f & 0x20);
        out.ch2_high_current_alarm = !!(f & 0x10);
        out.ch3_low_current_alarm = !!(f & 0x08);
        out.ch3_high_current_alarm = !!(f & 0x04);
        out.ch4_low_current_alarm = !!(f & 0x02);
        out.ch4_high_current_alarm = !!(f & 0x01);
    } else if (fPort === 5 && bytes.length >= 7) {
        out.battery_voltage = ((bytes[5] << 8) | bytes[6]) / 1000;
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
