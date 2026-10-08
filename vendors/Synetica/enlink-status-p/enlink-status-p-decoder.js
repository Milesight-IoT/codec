// Synetica enLink Status-P (ENL-STS-P/PX) LoRaWAN Pulse Counter payload decoder.
// Source: Synetica enLink payload specification (uplink TLV format tables),
// archived at manuals/Synetica/enlink-payload-specification.md - clean-room implementation.
// Uplink (fPort 1 by default) is a sequence of [Type 1B][Value nB] records;
// F32 values are big-endian IEEE 754. Pulse ID 0-2 maps to pulse channels 1-3.
var _dv = new DataView(new ArrayBuffer(4));
function _u16(b, i) { return (b[i] << 8) | b[i + 1]; }
function _u32(b, i) { return ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0; }
function _hex(b) {
  var s = '';
  for (var j = 0; j < b.length; j++) s += ('0' + b[j].toString(16)).slice(-2);
  return s.toUpperCase();
}
// Value length per Type from the enLink payload 'Type' table; unknown types stop the scan.
var _LEN = {
  0x01: 2, 0x02: 1, 0x03: 2, 0x04: 2, 0x05: 2, 0x06: 1, 0x07: 2, 0x08: 2, 0x09: 2, 0x0A: 2,
  0x0D: 2, 0x0E: 5, 0x0F: 2, 0x10: 5, 0x11: 5, 0x12: 4, 0x13: 4, 0x14: 4, 0x15: 2, 0x16: 1,
  0x17: 2, 0x18: 2, 0x19: 2, 0x1A: 4, 0x1B: 4, 0x1C: 4, 0x1D: 2, 0x1E: 2, 0x1F: 2, 0x20: 4,
  0x21: 4, 0x22: 4, 0x23: 2, 0x24: 2, 0x25: 2, 0x26: 4, 0x27: 4, 0x28: 4, 0x29: 2, 0x2A: 2,
  0x2B: 2, 0x2C: 4, 0x2D: 4, 0x2E: 2, 0x2F: 2, 0x30: 2, 0x31: 1, 0x32: 4, 0x33: 2, 0x34: 4,
  0x35: 2, 0x36: 4, 0x37: 4, 0x38: 4, 0x39: 4, 0x3A: 4, 0x3B: 2, 0x3C: 2, 0x3D: 2, 0x3F: 4,
  0x40: 2, 0x41: 1, 0x42: 2, 0x43: 2, 0x44: 1, 0x45: 2, 0x46: 2, 0x47: 1, 0x48: 2, 0x49: 2,
  0x4A: 2, 0x4B: 2, 0x4C: 2, 0x4D: 4, 0x4E: 2,
  0x50: 4, 0x51: 4, 0x52: 4, 0x53: 2, 0x54: 2, 0x55: 2, 0x56: 2, 0x57: 4, 0x58: 4, 0x59: 4,
  0x5A: 4, 0x5B: 4, 0x5C: 4, 0x5D: 4, 0x5E: 4, 0x5F: 4, 0x60: 4, 0x61: 5, 0x62: 5, 0x63: 3,
  0x64: 3, 0x65: 5, 0x66: 5, 0x67: 2, 0x68: 2, 0x69: 4, 0x6A: 4, 0x6B: 4, 0x6C: 4, 0x6D: 4,
  0x6E: 4, 0x6F: 4, 0x70: 2, 0x71: 2, 0x72: 2, 0x73: 4, 0x74: 5, 0x75: 4,
  0x76: 2, 0x77: 2, 0x78: 2, 0x79: 2, 0x7A: 2, 0x7B: 2, 0x7C: 2, 0xFE: 4
};
function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || !bytes.length) return out;
  var i = 0;
  while (i < bytes.length) {
    var t = bytes[i];
    if (t === 0x00) { // System Information: [Sys ID 1B][data 2B (fw) or 5B (plug-in gas serial)]
      var n = bytes[i + 1] === 0x1E ? 6 : 3;
      if (i + 1 + n > bytes.length) break;
      i += 1 + n;
      continue;
    }
    if (t === 0xA5) { // ACK/NACK reply: [ack 1B][command 1B] (+ 2B firmware version when command is 0x00)
      var m = bytes[i + 2] === 0x00 ? 4 : 2;
      if (i + 1 + m > bytes.length) break;
      i += 1 + m;
      continue;
    }
    var len = _LEN[t];
    if (len === undefined || i + 1 + len > bytes.length) break;
    var v = i + 1;
    switch (t) {
      case 0x0E: { // Pulse ID (0-2) + count U32
        var ch = bytes[v] + 1;
        if (ch >= 1 && ch <= 3) out['pulse_' + ch + '_count'] = _u32(bytes, v + 1);
        break;
      }
      case 0x15: { // Change of State: trigger status bitmap + input state bitmap
        var state = bytes[v + 1];
        out.trigger_status = bytes[v];
        out.input_state = state;
        out.input_1_closed = (state >> 0) & 1;
        out.input_2_closed = (state >> 1) & 1;
        out.input_3_closed = (state >> 2) & 1;
        break;
      }
      case 0x42: // KPI: battery voltage U16 mV
        out.battery_voltage = _u16(bytes, v);
        break;
      default:
        break; // type not used by this product - skipped per table
    }
    i += 1 + len;
  }
  out.raw_uplink = _hex(bytes);
  return out;
}
function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
