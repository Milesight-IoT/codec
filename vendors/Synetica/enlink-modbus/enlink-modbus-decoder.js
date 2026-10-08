// Source: Synetica enLink payload specification (manuals/Synetica/enlink-payload-specification.md)
// Product: Synetica enLink Modbus (LoRaWAN Modbus RTU RS485 master, 32 configurable registers).
// Uplink fPort 1 (configurable): concatenated TLV records, 1-byte type + fixed-length
// big-endian value (F32 = IEEE754).
// Modbus types: 0x10 interval value (register index 0-31 + F32), 0x11 cumulative value,
// 0x0F exception code (register index + U8, standard Modbus exception codes).
// Register index is 0-based, exposed here as modbus_1..modbus_32 (index + 1).
// KPI type 0x42 battery voltage in mV, 3600 = external power (Modbus is externally powered).
// Frames may carry any subset of the 32 registers. Clean-room implementation from
// the published format tables only.
function _hex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16)).slice(-2);
  return s.toUpperCase();
}
function _u16(b, o) {
  return (b[o] << 8) | b[o + 1];
}
function _f32(b, o) {
  var dv = new DataView(new Uint8Array([b[o], b[o + 1], b[o + 2], b[o + 3]]).buffer);
  return dv.getFloat32(0, false);
}
// type -> [value length, decode fn]; types without a decode fn are skipped by length
var _TYPES = {
  0x01: [2],
  0x02: [1],
  0x03: [2],
  0x04: [2],
  0x05: [2],
  0x06: [1],
  0x07: [2],
  0x08: [2],
  0x09: [2],
  0x0A: [2],
  0x0D: [2],
  0x0E: [5],
  0x0F: [2, function (b, out) { out['modbus_' + (b[0] + 1) + '_exception'] = b[1]; }],
  0x10: [5, function (b, out) { out['modbus_' + (b[0] + 1) + '_interval'] = _f32(b, 1); }],
  0x11: [5, function (b, out) { out['modbus_' + (b[0] + 1) + '_cumulative'] = _f32(b, 1); }],
  0x12: [4],
  0x13: [4],
  0x14: [4],
  0x15: [2],
  0x16: [1],
  0x17: [2], 0x18: [2], 0x19: [2],
  0x1A: [4], 0x1B: [4], 0x1C: [4],
  0x1D: [2], 0x1E: [2], 0x1F: [2],
  0x20: [4], 0x21: [4], 0x22: [4],
  0x23: [2], 0x24: [2], 0x25: [2],
  0x26: [4], 0x27: [4], 0x28: [4],
  0x29: [2], 0x2A: [2], 0x2B: [2],
  0x2C: [4], 0x2D: [4],
  0x2E: [2], 0x2F: [2],
  0x30: [2], 0x31: [1],
  0x32: [4], 0x33: [2], 0x34: [4], 0x35: [2],
  0x36: [4], 0x37: [4], 0x38: [4], 0x39: [4], 0x3A: [4],
  0x3B: [2], 0x3C: [2], 0x3D: [2],
  0x3F: [4],
  0x40: [2],
  0x41: [1],
  0x42: [2, function (b, out) { out.battery_voltage = _u16(b, 0); }],
  0x43: [2], 0x44: [1], 0x45: [2], 0x46: [2], 0x47: [1], 0x48: [2],
  0x49: [2], 0x4A: [2], 0x4B: [2], 0x4C: [2], 0x4D: [4], 0x4E: [2],
  0x50: [4], 0x51: [4], 0x52: [4],
  0x53: [2], 0x54: [2], 0x55: [2], 0x56: [2],
  0x57: [4], 0x58: [4], 0x59: [4], 0x5A: [4],
  0x5B: [4], 0x5C: [4], 0x5D: [4], 0x5E: [4], 0x5F: [4], 0x60: [4],
  0x61: [5], 0x62: [5], 0x63: [3], 0x64: [3], 0x65: [5], 0x66: [5],
  0x67: [2], 0x68: [2],
  0x69: [4], 0x6A: [4], 0x6B: [4], 0x6C: [4], 0x6D: [4], 0x6E: [4], 0x6F: [4],
  0x70: [2], 0x71: [2], 0x72: [2], 0x73: [4], 0x74: [5],
  0x75: [4], 0x76: [2], 0x77: [2], 0x78: [2], 0x79: [2], 0x7A: [2], 0x7B: [2], 0x7C: [2],
  0xFE: [4]
};
function _decode(bytes) {
  var out = {};
  if (!bytes || !bytes.length) return out;
  var i = 0;
  while (i < bytes.length) {
    var t = bytes[i];
    i += 1;
    if (t === 0x00) { // system information: length depends on Sys-ID
      if (i + 3 > bytes.length) break;
      if (bytes[i] === 0x00) {
        out.firmware_version = bytes[i + 1] + '.' + bytes[i + 2];
        i += 3;
      } else if (bytes[i] === 0x1E) {
        if (i + 6 > bytes.length) break;
        i += 6;
      } else break;
      continue;
    }
    if (t === 0xA5) { // ACK/NACK reply: 2 bytes, +2 more when command is 0x00
      if (i + 2 > bytes.length) break;
      i += (bytes[i + 1] === 0x00 && i + 4 <= bytes.length) ? 4 : 2;
      continue;
    }
    var def = _TYPES[t];
    if (!def || i + def[0] > bytes.length) break;
    if (def[1]) def[1](bytes.slice(i, i + def[0]), out);
    i += def[0];
  }
  out.raw_uplink = _hex(bytes);
  return out;
}
function decodeUplink(input) { return { data: _decode(input && input.bytes) }; }
function Decode(fPort, bytes) { return _decode(bytes); }
function Decoder(bytes, port) { return _decode(bytes, port); }
