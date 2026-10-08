// Watteco PT1000 temperature transceiver uplink decoder.
// Source: https://support.watteco.com/pt1000/ (frame examples, port 125) and
// Temperature Measurement cluster 0x0402: https://support.watteco.com/temperature-measurement-cluster/
// // Cleanroom implementation: frame layout derived solely from the vendor documentation

// ZCL frame on port 125: <0x11><cmd 0x0A><0x0402><attr><type 0x29><I16>.
// Attribute 0x0000 measured value in 0.01 degC (value/100); attributes 0x0001/0x0002
// are the sensor min/max measurable values. Note: variant 50-70-288 sends the value
// in 0.1 degC units (see PT1000 page) - the /100 scaling follows the cluster standard.
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
  if (!bytes || bytes.length < 8) return out;
  out.raw_uplink = _hex(bytes);
  if (bytes[1] !== 0x0A) return out;
  if (_u16(bytes, 2) !== 0x0402) return out;
  var aid = _u16(bytes, 4);
  if (bytes[6] !== 0x29) return out;
  var v = _i16(bytes, 7);
  if (aid === 0x0000) out.temperature = v / 100;
  else if (aid === 0x0001) out.min_measured_temperature = v / 100;
  else if (aid === 0x0002) out.max_measured_temperature = v / 100;
  return out;
}
function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
