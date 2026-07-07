function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || fPort !== 2 || bytes.length < 9) return out;
    out.battery_voltage = ((bytes[0] << 8) | bytes[1]) / 1000;
    out.probe_model = bytes[2];
    out.idc_input_ma = ((bytes[4] << 8) | bytes[5]) / 1000;
    out.vdc_input_v = ((bytes[6] << 8) | bytes[7]) / 1000;
    out.input1_pin_level_high = (bytes[8] & 0x08) ? 1 : 0;
    out.input2_pin_level_high = (bytes[8] & 0x04) ? 1 : 0;
    out.interrupt_pin_level_high = (bytes[8] & 0x02) ? 1 : 0;
    out.is_interrupt_packet = (bytes[8] & 0x01) ? 1 : 0;
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
