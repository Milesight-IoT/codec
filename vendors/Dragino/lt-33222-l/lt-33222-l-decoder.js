function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || fPort !== 2 || bytes.length < 11) return out;
    var hardware = (bytes[10] & 0xc0) >> 6;
    var mode = bytes[10] & 0x3f;
    if (hardware !== 0) return out;
    if (mode === 1) {
        out.mode = '2ACI+2AVI';
        out.voltage1 = parseFloat((((((bytes[0] << 24) >> 16) | bytes[1]) / 1000)).toFixed(3));
        out.voltage2 = parseFloat((((((bytes[2] << 24) >> 16) | bytes[3]) / 1000)).toFixed(3));
        out.current1 = parseFloat((((((bytes[4] << 24) >> 16) | bytes[5]) / 1000)).toFixed(3));
        out.current2 = parseFloat((((((bytes[6] << 24) >> 16) | bytes[7]) / 1000)).toFixed(3));
        out.digital_input1 = (bytes[8] & 0x08) ? 1 : 0;
        out.digital_input2 = (bytes[8] & 0x10) ? 1 : 0;
        out.digital_input3 = (bytes[8] & 0x20) ? 1 : 0;
    } else if (mode === 2) {
        out.mode = 'Count mode 1';
        out.count1 = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
        out.count2 = ((bytes[4] << 24) | (bytes[5] << 16) | (bytes[6] << 8) | bytes[7]) >>> 0;
    } else if (mode === 3) {
        out.mode = '2ACI+1Count';
        out.count1 = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
        out.current1 = parseFloat((((((bytes[4] << 24) >> 16) | bytes[5]) / 1000)).toFixed(3));
        out.current2 = parseFloat((((((bytes[6] << 24) >> 16) | bytes[7]) / 1000)).toFixed(3));
    } else if (mode === 4) {
        out.mode = 'Count mode 2';
        out.count3 = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
        out.voltage_count = ((bytes[4] << 24) | (bytes[5] << 16) | (bytes[6] << 8) | bytes[7]) >>> 0;
    } else if (mode === 5) {
        out.mode = '1ACI+2AVI+1Count';
        out.voltage1 = parseFloat((((((bytes[0] << 24) >> 16) | bytes[1]) / 1000)).toFixed(3));
        out.voltage2 = parseFloat((((((bytes[2] << 24) >> 16) | bytes[3]) / 1000)).toFixed(3));
        out.current1 = parseFloat((((((bytes[4] << 24) >> 16) | bytes[5]) / 1000)).toFixed(3));
        out.count1 = (bytes[6] << 8) | bytes[7];
    } else {
        return out;
    }
    if (mode !== 6) {
        out.digital_output1 = (bytes[8] & 0x01) ? 0 : 1;
        out.digital_output2 = (bytes[8] & 0x02) ? 0 : 1;
        out.digital_output3 = (bytes[8] & 0x04) ? 0 : 1;
        out.relay_output1 = (bytes[8] & 0x80) ? 1 : 0;
        out.relay_output2 = (bytes[8] & 0x40) ? 1 : 0;
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
