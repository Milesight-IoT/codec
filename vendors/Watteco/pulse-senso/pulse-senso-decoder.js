// Watteco Pulse Sens'O (3-input pulse counter) uplink decoder.
// Source: https://support.watteco.com/pulsesenso-2/ (frame examples, port 125) and cluster pages:
// Binary Input 0x000F: https://support.watteco.com/cluster-binary-input/
// Multi Binary Inputs 0x8005: https://support.watteco.com/multi-binary-inputs-cluster/
// // Cleanroom implementation: frame layout derived solely from the vendor documentation

// ZCL frame on port 125: <Fctrl><cmd 0x0A><0x000F><AID><type><data>.
// Fctrl 0x11/0x31/0x51 selects input 1/2/3. Attribute 0x0055 type 0x10 = present value
// (bool), attribute 0x0402 type 0x23 = pulse counter U32.
// Cluster 0x8005 attr 0x0000 type 0x19 = 16-bit bitmap of all input states.
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
var INPUTS = { 1: 1, 3: 2, 5: 3 };
function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 8) return out;
  out.raw_uplink = _hex(bytes);
  if (bytes[1] !== 0x0A) return out;
  var cid = _u16(bytes, 2);
  var aid = _u16(bytes, 4);
  var type = bytes[6];
  var n = INPUTS[(bytes[0] >> 4) & 0x07];
  if (cid === 0x000F && n) {
    if (aid === 0x0055 && type === 0x10 && bytes.length >= 8) out['input' + n + '_state'] = bytes[7] === 1;
    else if (aid === 0x0402 && type === 0x23 && bytes.length >= 11) out['input' + n + '_count'] = _u32(bytes, 7);
  } else if (cid === 0x8005 && aid === 0x0000 && type === 0x19 && bytes.length >= 9) {
    out.inputs_bitmap = _u16(bytes, 7);
  }
  return out;
}
function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
