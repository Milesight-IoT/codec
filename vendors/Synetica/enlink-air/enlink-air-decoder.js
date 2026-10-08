// Source: Synetica enLink payload specification + enLink Air datasheet
// Clean-room implementation. enLink Air (FW-AQM, indoor air quality monitor):
// temperature/humidity (0x01/0x02, hi-res 0x3B), light (0x03), pressure/VOC IAQ/
// bVOC/CO2e (0x04/0x05/0x12/0x3F), CO2 (0x08), oxygen (0x06), sound (0x50-0x52),
// particulates (0x57-0x60), up to 4 plug-in gas sensors (0x61 ppb / 0x66 ug/m3),
// battery KPI (0x42 mV).
// Uplink fPort 1 by default (configurable 1-223): TLV stream [Type 1B][Value nB],
// F32 values are IEEE 754 big-endian. Unknown Type stops parsing (length unknown).
// Example (spec): 01 01 23 02 56 03 01 A4 -> temperature 29.1 C, humidity 86 %, light 420 lx

var _VALUE_LEN = {
  0x01: 2, 0x02: 1, 0x03: 2, 0x04: 2, 0x05: 2, 0x06: 1, 0x07: 2, 0x08: 2,
  0x09: 2, 0x0A: 2, 0x0D: 2, 0x0E: 5, 0x0F: 2, 0x10: 5, 0x11: 5, 0x12: 4,
  0x13: 4, 0x14: 4, 0x15: 2, 0x16: 1, 0x17: 2, 0x18: 2, 0x19: 2, 0x1A: 4,
  0x1B: 4, 0x1C: 4, 0x1D: 2, 0x1E: 2, 0x1F: 2, 0x20: 4, 0x21: 4, 0x22: 4,
  0x23: 2, 0x24: 2, 0x25: 2, 0x26: 4, 0x27: 4, 0x28: 4, 0x29: 2, 0x2A: 2,
  0x2B: 2, 0x2C: 4, 0x2D: 4, 0x2E: 2, 0x2F: 2, 0x30: 2, 0x31: 1, 0x32: 4,
  0x33: 2, 0x34: 4, 0x35: 2, 0x36: 4, 0x37: 4, 0x38: 4, 0x39: 4, 0x3A: 4,
  0x3B: 2, 0x3C: 2, 0x3D: 2, 0x3F: 4, 0x40: 2, 0x41: 1, 0x42: 2, 0x43: 2,
  0x44: 1, 0x45: 2, 0x46: 2, 0x47: 1, 0x48: 2, 0x49: 2, 0x4A: 2, 0x4B: 2,
  0x4C: 2, 0x4D: 4, 0x4E: 2, 0x50: 4, 0x51: 4, 0x52: 4, 0x53: 2, 0x54: 2,
  0x55: 2, 0x56: 2, 0x57: 4, 0x58: 4, 0x59: 4, 0x5A: 4, 0x5B: 4, 0x5C: 4,
  0x5D: 4, 0x5E: 4, 0x5F: 4, 0x60: 4, 0x61: 5, 0x62: 5, 0x63: 3, 0x64: 3,
  0x65: 5, 0x66: 5, 0x67: 2, 0x68: 2, 0x69: 4, 0x6A: 4, 0x6B: 4, 0x6C: 4,
  0x6D: 4, 0x6E: 4, 0x6F: 4, 0x70: 2, 0x71: 2, 0x72: 2, 0x73: 4, 0x74: 5,
  0x75: 4, 0x76: 2, 0x77: 2, 0x78: 2, 0x79: 2, 0x7A: 2, 0x7B: 2, 0x7C: 2,
  0xFE: 4
};

function _u8(b, o) {
  return b[o] & 0xFF;
}

function _s16(b, o) {
  var v = (b[o] << 8) | b[o + 1];
  return v >= 0x8000 ? v - 0x10000 : v;
}

function _u16(b, o) {
  return ((b[o] << 8) | b[o + 1]) & 0xFFFF;
}

function _u32(b, o) {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}

function _f32(b, o) {
  var buf = new ArrayBuffer(4);
  var dv = new DataView(buf);
  for (var k = 0; k < 4; k++) dv.setUint8(k, b[o + k]);
  return dv.getFloat32(0);
}

function _r2(v) {
  return Math.round(v * 100) / 100;
}

function _hex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16)).slice(-2);
  return s.toUpperCase();
}

function _decode(bytes) {
  var out = {};
  if (!bytes || !bytes.length) return out;
  out.raw_uplink = _hex(bytes);

  var gasSlot = {};
  var gasNext = 1;
  var i = 0;
  while (i < bytes.length) {
    var t = bytes[i];
    if (t === 0xA5) break; // ACK/NACK reply to a downlink, no sensor data follows
    var len;
    if (t === 0x00) { // System Information: byte after Type selects the entry
      if (i + 1 >= bytes.length) break;
      if (bytes[i + 1] === 0x00) len = 3; // SysID + MAJOR + MINOR
      else if (bytes[i + 1] === 0x1E) len = 6; // SysID + 5-byte plug-in gas serial
      else len = undefined;
    } else {
      len = _VALUE_LEN[t];
    }
    if (len === undefined) break; // unknown type: length cannot be determined
    if (i + 1 + len > bytes.length) break; // truncated value
    var o = i + 1;
    switch (t) {
      case 0x01: out.temperature = _s16(bytes, o) / 10; break;
      case 0x02: out.humidity = _u8(bytes, o); break;
      case 0x3B: out.humidity = _u16(bytes, o) / 100; break;
      case 0x03: out.light = _u16(bytes, o); break;
      case 0x04: out.pressure = _u16(bytes, o); break;
      case 0x05: out.voc_iaq = _u16(bytes, o); break;
      case 0x06: out.oxygen = _u8(bytes, o) / 10; break;
      case 0x08: out.co2 = _u16(bytes, o); break;
      case 0x12: out.bvoc_ppm = _r2(_f32(bytes, o)); break;
      case 0x3F: out.co2e_ppm = _r2(_f32(bytes, o)); break;
      case 0x13: out.detection_count = _u32(bytes, o); break;
      case 0x14: out.occupied_duration = _u32(bytes, o); break;
      case 0x16: out.detection_status = _u8(bytes, o); break;
      case 0x36: out.tvoc_min = _r2(_f32(bytes, o)); break;
      case 0x37: out.tvoc_avg = _r2(_f32(bytes, o)); break;
      case 0x38: out.tvoc_max = _r2(_f32(bytes, o)); break;
      case 0x39: out.etoh_ppm = _r2(_f32(bytes, o)); break;
      case 0x3A: out.tvoc_iaq = _r2(_f32(bytes, o)); break;
      case 0x50: out.sound_min = _r2(_f32(bytes, o)); break;
      case 0x51: out.sound_avg = _r2(_f32(bytes, o)); break;
      case 0x52: out.sound_max = _r2(_f32(bytes, o)); break;
      case 0x57: out.pm1_0 = _r2(_f32(bytes, o)); break;
      case 0x58: out.pm2_5 = _r2(_f32(bytes, o)); break;
      case 0x59: out.pm4_0 = _r2(_f32(bytes, o)); break;
      case 0x5A: out.pm10_0 = _r2(_f32(bytes, o)); break;
      case 0x5B: out.pc0_5 = _r2(_f32(bytes, o)); break;
      case 0x5C: out.pc1_0 = _r2(_f32(bytes, o)); break;
      case 0x5D: out.pc2_5 = _r2(_f32(bytes, o)); break;
      case 0x5E: out.pc4_0 = _r2(_f32(bytes, o)); break;
      case 0x5F: out.pc10_0 = _r2(_f32(bytes, o)); break;
      case 0x60: out.typical_particle_size = _r2(_f32(bytes, o)); break;
      case 0x42: out.battery_voltage = _u16(bytes, o); break;
      case 0x00:
        if (bytes[o] === 0x00) out.firmware_version = bytes[o + 1] + '.' + bytes[o + 2];
        break; // 0x1E plug-in gas serial: skipped
      case 0x61:
      case 0x66: {
        var gid = _u8(bytes, o);
        var slot = gasSlot[gid];
        if (slot === undefined && gasNext <= 4) {
          slot = gasNext;
          gasNext++;
          gasSlot[gid] = slot;
        }
        if (slot !== undefined) {
          out['gas_' + slot + '_id'] = gid;
          if (t === 0x61) out['gas_' + slot + '_ppb'] = _r2(_f32(bytes, o + 1));
          else out['gas_' + slot + '_ugm3'] = _r2(_f32(bytes, o + 1));
        }
        break;
      }
      default: break; // known type not carried by this product: skip by length
    }
    i += 1 + len;
  }
  return out;
}

function decodeUplink(input) {
  return { data: _decode(input && input.bytes) };
}

function Decode(fPort, bytes) {
  return _decode(bytes);
}

function Decoder(bytes, port) {
  return _decode(bytes);
}
