// NKE Watteco SmartPilot Wire (LoRaWAN pilot-wire radiator controller) uplink decoder.
// Source: https://support.watteco.com/pilote-wire-lora-remote/ and
// MultiState Output cluster 0x0013: https://support.watteco.com/multistate-output-cluster/
// // Cleanroom implementation: frame layout derived solely from the vendor documentation

// Uplink report on port 125: <0x11><0x0A><0x0013><0x0055><0x20><mode U8>.
// Modes (cluster spec): 0 Comfort, 1 Economic, 2 AntiFreeze, 3 Stop, 4 Comfort-1, 5 Comfort-2.
// Mode is set by the write command <0x11><0x05><0x0013><0x0055><0x20><mode> which is
// transported through the raw_downlink passthrough encoder.
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
  if (_u16(bytes, 2) !== 0x0013 || _u16(bytes, 4) !== 0x0055) return out;
  if (bytes[6] !== 0x20) return out;
  out.pilot_wire_mode = bytes[7];
  return out;
}
function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
