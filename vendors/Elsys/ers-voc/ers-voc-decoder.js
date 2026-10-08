// Source: Elsys ERS VOC datasheet (Data types), ELSYS uplink payload Application Note 2026-08-18 (Basic structure, Defined types, Appendix 1)
var _TYPE_LEN = {
  0x01: 2, 0x02: 1, 0x03: 3, 0x04: 2, 0x05: 1, 0x06: 2, 0x07: 2, 0x08: 2,
  0x09: 6, 0x0A: 2, 0x0B: 4, 0x0C: 2, 0x0D: 1, 0x0E: 2, 0x0F: 1, 0x10: 4,
  0x11: 1, 0x12: 1, 0x13: 65, 0x14: 4, 0x15: 2, 0x16: 2, 0x17: 4, 0x18: 2,
  0x19: 2, 0x1A: 1, 0x1B: 4, 0x1C: 2, 0x1D: 1, 0x1E: 1, 0x1F: 1, 0x20: 2,
  0x21: 1, 0x22: 2, 0x23: 1, 0x24: 1, 0x3D: 4
};

function _s16(bytes, i) {
  var v = (bytes[i] << 8) | bytes[i + 1];
  return v > 0x7FFF ? v - 0x10000 : v;
}

function _hexAt(bytes, i, len) {
  var s = '';
  for (var j = 0; j < len; j++) s += ('0' + bytes[i + j].toString(16)).slice(-2);
  return s.toUpperCase();
}

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || !bytes.length) return out;
  var i = 0;
  while (i < bytes.length) {
    var head = bytes[i++];
    var stype = head & 0x3F;
    var nob = head >> 6;
    var tsLen = nob === 3 ? 4 : nob;
    var len;
    if (stype === 0x3E) {
      len = bytes.length - i - tsLen;
    } else {
      len = _TYPE_LEN[stype];
    }
    if (len === undefined || len < 0 || i + len + tsLen > bytes.length) break;
    switch (stype) {
      case 0x01:
        if (out.temperature === undefined) out.temperature = _s16(bytes, i) / 10;
        break;
      case 0x02:
        if (out.humidity === undefined) out.humidity = bytes[i];
        break;
      case 0x04:
        if (out.light === undefined) out.light = (bytes[i] << 8) | bytes[i + 1];
        break;
      case 0x05:
        if (out.motion === undefined) out.motion = bytes[i];
        break;
      case 0x07:
        // raw uint16, unit mV (AppNote 0x07 Internal battery voltage: 0-65535 mV)
        if (out.battery_voltage === undefined) out.battery_voltage = (bytes[i] << 8) | bytes[i + 1];
        break;
      case 0x1C:
        if (out.voc === undefined) out.voc = (bytes[i] << 8) | bytes[i + 1];
        break;
      case 0x3D:
        if (out.debug_info === undefined) {
          out.debug_info = ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
        }
        break;
      case 0x3E:
        if (out.sensor_settings === undefined && len > 0) out.sensor_settings = _hexAt(bytes, i, len);
        break;
      default:
        break;
    }
    i += len + tsLen;
  }
  out.raw_uplink = _hexAt(bytes, 0, bytes.length);
  return out;
}

function decodeUplink(input) { return { data: _decode(input && input.bytes, input && input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
