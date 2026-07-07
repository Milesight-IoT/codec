function _pad(n) { return n < 10 ? '0' + n : '' + n; }
function _ts(b, o) {
    var s = ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
    if (!s) return '';
    var d = new Date(s * 1000);
    return d.getUTCFullYear() + '-' + _pad(d.getUTCMonth() + 1) + '-' + _pad(d.getUTCDate()) + ' ' +
        _pad(d.getUTCHours()) + ':' + _pad(d.getUTCMinutes()) + ':' + _pad(d.getUTCSeconds());
}

function _decode(bytes, fPort) {
    var out = {};
    if (!bytes) return out;
    if (fPort === 5 && bytes.length >= 7) {
        out.battery_voltage = ((bytes[5] << 8) | bytes[6]) / 1000;
        return out;
    }
    if (bytes.length < 11) return out;
    var isCpl03 = !!(bytes[0] & 0x08);
    out.count_mod = (bytes[0] & 0x20) ? 1 : 0;
    out.tdc = (bytes[0] & 0x10) ? 1 : 0;
    if (isCpl03) {
        out.calculate_flag = bytes[0] & 0x07;
        out.pa8_total_pulse = (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
        out.pa4_total_pulse = (bytes[4] << 16) | (bytes[5] << 8) | bytes[6];
        out.pb15_total_pulse = (bytes[7] << 16) | (bytes[8] << 8) | bytes[9];
    } else {
        out.calculate_flag = (bytes[0] & 0x04) >> 2;
        out.pa8_total_pulse = (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
        out.log_date_time = _ts(bytes, 7);
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
