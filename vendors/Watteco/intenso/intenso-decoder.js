// Watteco Intens'O (current transformer sensor) uplink decoder.
// Source: Intens'O User Guide 1.1 (50-70-098), chapter 2 applicative layer, examples 2.4/2.5.2:
// https://support.watteco.com/wp-content/uploads/2019/03/50-70-098_Intenso_User_Guide_1.1_Revised.pdf
// and Analog Input cluster 0x000C: https://support.watteco.com/analog-input-cluster/
// // Cleanroom implementation: frame layout derived solely from the vendor documentation

// ZCL frame on port 125, endpoint 0x31 (current measurement):
// <0x31><cmd><0x000C><0x0055><0x39><IEEE754 float32 BE current in A>.
// cmd 0x0A = standard report, 0x8A = alarm report followed by report params (RP) and
// criteria slot descriptor (CSD) bytes (User Guide 2.5.2).
function _hex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16)).slice(-2);
  return s.toUpperCase();
}
function _u8(b, o) { return b[o]; }
function _i8(b, o) { return (b[o] << 24 >> 24); }
function _u16(b, o) { return (b[o] << 8) | b[o + 1]; }
function _i16(b, o) { var v = _u16(b, o); return v >= 0x8000 ? v - 0x10000 : v; }
function _u24(b, o) { return (b[o] << 16) | (b[o + 1] << 8) | b[o + 2]; }
function _i24(b, o) { var v = _u24(b, o); return v >= 0x800000 ? v - 0x1000000 : v; }
function _u32(b, o) { return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0; }
function _i32(b, o) { return (b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]; }
function _f32(b, o) {
  var sign = b[o] & 0x80 ? -1 : 1;
  var exp = ((b[o] & 0x7f) << 1) | (b[o + 1] >> 7);
  var man = ((b[o + 1] & 0x7f) << 16) | (b[o + 2] << 8) | b[o + 3];
  if (exp === 0 && man === 0) return 0.0;
  if (exp === 255) return man ? NaN : sign * Infinity;
  return sign * Math.pow(2, exp - 127) * (1 + man / 0x800000);
}
function _bcd(v) { return ((v >> 4) * 10) + (v & 0x0f); }
function _pad(n) { return n < 10 ? '0' + n : '' + n; }
function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 11) return out;
  out.raw_uplink = _hex(bytes);
  if (_u16(bytes, 2) !== 0x000C || _u16(bytes, 4) !== 0x0055) return out;
  if (bytes[6] !== 0x39) return out;
  if (bytes[1] === 0x0A || bytes[1] === 0x8A) {
    out.current = Math.round(_f32(bytes, 7) * 1000000) / 1000000;
    if (bytes[1] === 0x8A) {
      out.alarm = true;
      if (bytes.length >= 12) out.alarm_criteria_slot = bytes[11] & 0x07;
    } else out.alarm = false;
  }
  return out;
}
function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
