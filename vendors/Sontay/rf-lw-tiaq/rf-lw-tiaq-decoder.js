// Source: Sontay RF-LW-TIAQ LoRaWAN Indoor Air Quality Monitoring (enLink IAQ OEM, firmware FW-AQ)
// Format: enLink TLV uplink - records of [type byte][value bytes], default fPort 1
// Spec: Synetica enLink LoRaWAN payload specification (official README, MIT); Sontay RF-LW-TIAQ datasheet
function _s16(hi, lo) {
  var v = (hi << 8) | lo;
  return v >= 0x8000 ? v - 0x10000 : v;
}
function _u16(hi, lo) {
  return ((hi << 8) | lo) >>> 0;
}
function _u32(b0, b1, b2, b3) {
  return (((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0);
}
function _f32(b0, b1, b2, b3) {
  var buf = new ArrayBuffer(4);
  var u8 = new Uint8Array(buf);
  u8[0] = b0; u8[1] = b1; u8[2] = b2; u8[3] = b3;
  return new DataView(buf).getFloat32(0);
}
function _r2(v) {
  return Math.round(v * 100) / 100;
}
// Gas IDs documented for the RF-LW-TIAQ plug-in sensor options
var _gasNames = {
  0x17: 'formaldehyde', 0x19: 'carbon_monoxide', 0x1C: 'hydrogen_sulphide',
  0x20: 'ammonia', 0x21: 'nitrogen_dioxide', 0x22: 'oxygen',
  0x23: 'ozone', 0x24: 'sulphur_dioxide'
};
function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || !bytes.length) return out;
  var hex = [];
  for (var h = 0; h < bytes.length; h++) hex.push(('0' + bytes[h].toString(16)).slice(-2).toUpperCase());
  out.raw_uplink = hex.join('');
  var i = 0;
  while (i < bytes.length) {
    var t = bytes[i];
    if (t === 0x00) {
      if (bytes[i + 1] === 0x00 && i + 3 < bytes.length) {
        out.firmware_version = bytes[i + 2] + '.' + bytes[i + 3];
        i += 4;
      } else if (bytes[i + 1] === 0x1E) {
        i += 7; // plug-in gas serial number, not exposed
      } else {
        i += 2;
      }
    } else if (t === 0xA5) {
      var ok = bytes[i + 1] === 0x06;
      var cmd = ('0' + bytes[i + 2].toString(16)).slice(-2).toUpperCase();
      out.ack = (ok ? 'ACK 0x' : 'NACK 0x') + cmd;
      i += 3;
    } else if (t === 0x01 && i + 2 < bytes.length) {
      out.temperature = _s16(bytes[i + 1], bytes[i + 2]) / 10;
      i += 3;
    } else if (t === 0x02 && i + 1 < bytes.length) {
      out.humidity = bytes[i + 1];
      i += 2;
    } else if (t === 0x3B && i + 2 < bytes.length) {
      out.humidity = _u16(bytes[i + 1], bytes[i + 2]) / 100;
      i += 3;
    } else if (t === 0x04 && i + 2 < bytes.length) {
      out.pressure = _u16(bytes[i + 1], bytes[i + 2]);
      i += 3;
    } else if (t === 0x05 && i + 2 < bytes.length) {
      out.iaq_index = _u16(bytes[i + 1], bytes[i + 2]);
      i += 3;
    } else if (t === 0x12 && i + 4 < bytes.length) {
      out.tvoc = _r2(_f32(bytes[i + 1], bytes[i + 2], bytes[i + 3], bytes[i + 4]));
      i += 5;
    } else if (t === 0x3F && i + 4 < bytes.length) {
      out.co2e = _r2(_f32(bytes[i + 1], bytes[i + 2], bytes[i + 3], bytes[i + 4]));
      i += 5;
    } else if (t === 0x08 && i + 2 < bytes.length) {
      out.co2 = _u16(bytes[i + 1], bytes[i + 2]);
      i += 3;
    } else if (t === 0x57 && i + 4 < bytes.length) {
      out.pm1_0 = _r2(_f32(bytes[i + 1], bytes[i + 2], bytes[i + 3], bytes[i + 4]));
      i += 5;
    } else if (t === 0x58 && i + 4 < bytes.length) {
      out.pm2_5 = _r2(_f32(bytes[i + 1], bytes[i + 2], bytes[i + 3], bytes[i + 4]));
      i += 5;
    } else if (t === 0x59 && i + 4 < bytes.length) {
      out.pm4_0 = _r2(_f32(bytes[i + 1], bytes[i + 2], bytes[i + 3], bytes[i + 4]));
      i += 5;
    } else if (t === 0x5A && i + 4 < bytes.length) {
      out.pm10_0 = _r2(_f32(bytes[i + 1], bytes[i + 2], bytes[i + 3], bytes[i + 4]));
      i += 5;
    } else if (t === 0x5B && i + 4 < bytes.length) {
      out.pm0_5_count = _r2(_f32(bytes[i + 1], bytes[i + 2], bytes[i + 3], bytes[i + 4]));
      i += 5;
    } else if (t === 0x5C && i + 4 < bytes.length) {
      out.pm1_0_count = _r2(_f32(bytes[i + 1], bytes[i + 2], bytes[i + 3], bytes[i + 4]));
      i += 5;
    } else if (t === 0x5D && i + 4 < bytes.length) {
      out.pm2_5_count = _r2(_f32(bytes[i + 1], bytes[i + 2], bytes[i + 3], bytes[i + 4]));
      i += 5;
    } else if (t === 0x5E && i + 4 < bytes.length) {
      out.pm4_0_count = _r2(_f32(bytes[i + 1], bytes[i + 2], bytes[i + 3], bytes[i + 4]));
      i += 5;
    } else if (t === 0x5F && i + 4 < bytes.length) {
      out.pm10_0_count = _r2(_f32(bytes[i + 1], bytes[i + 2], bytes[i + 3], bytes[i + 4]));
      i += 5;
    } else if (t === 0x60 && i + 4 < bytes.length) {
      out.typical_particle_size = _r2(_f32(bytes[i + 1], bytes[i + 2], bytes[i + 3], bytes[i + 4]));
      i += 5;
    } else if (t === 0x50 && i + 4 < bytes.length) {
      out.sound_level_min = _r2(_f32(bytes[i + 1], bytes[i + 2], bytes[i + 3], bytes[i + 4]));
      i += 5;
    } else if (t === 0x51 && i + 4 < bytes.length) {
      out.sound_level_avg = _r2(_f32(bytes[i + 1], bytes[i + 2], bytes[i + 3], bytes[i + 4]));
      i += 5;
    } else if (t === 0x52 && i + 4 < bytes.length) {
      out.sound_level_max = _r2(_f32(bytes[i + 1], bytes[i + 2], bytes[i + 3], bytes[i + 4]));
      i += 5;
    } else if ((t === 0x61 || t === 0x66) && i + 5 < bytes.length) {
      var name = _gasNames[bytes[i + 1]];
      if (name) {
        out[name + (t === 0x61 ? '_ppb' : '_ugm3')] = _r2(_f32(bytes[i + 2], bytes[i + 3], bytes[i + 4], bytes[i + 5]));
      }
      i += 6;
    } else if (t === 0x4E && i + 2 < bytes.length) {
      out.cpu_temperature = _s16(bytes[i + 1], bytes[i + 2]) / 10;
      i += 3;
    } else if (t === 0x42 && i + 2 < bytes.length) {
      out.battery_voltage = Math.round(_u16(bytes[i + 1], bytes[i + 2]) / 10) / 100;
      i += 3;
    } else if (t === 0x41 && i + 1 < bytes.length) {
      out.battery_status = bytes[i + 1];
      i += 2;
    } else if (t === 0x4D && i + 4 < bytes.length) {
      // KPI: air intake fan runtime U32 seconds
      out.fan_runtime = _u32(bytes[i + 1], bytes[i + 2], bytes[i + 3], bytes[i + 4]);
      i += 5;
    } else {
      break; // unknown type, cannot determine record length
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
