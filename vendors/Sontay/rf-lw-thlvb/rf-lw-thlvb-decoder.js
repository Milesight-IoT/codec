// Source: Sontay RF-LW-THVB/-S family LoRaWAN Indoor Environment Sensors, variants RF-LW-THVB-S, THLVBS-S,
// THLVBMS-S, THLVBPM-S, THLVBC-S, THLVBCS-S, THLVBCM-S, THLVBCMS-S (OEM of Synetica enLink Zone, firmware FW-ZN-LV*)
// Sontay datasheet / user guide: https://www.sontay.com/en-gb/products/smart-devices/lorawan/rf-lw-thvb-lorawan-wireless-indoor-environment-sensors/
// Synetica enLink uplink payload spec (TLV, fPort 1): 0x01 temperature S16 / 10 degC, 0x02 humidity U8 %rH,
// 0x03 ambient light U16 lux, 0x04 pressure U16 mbar, 0x05 VOC static IAQ index U16, 0x08 NDIR CO2 U16 ppm,
// 0x13 motion detection count U32, 0x14 occupied duration U32 s, 0x50/0x51/0x52 sound min/avg/max F32 dB,
// KPI 0x42 battery voltage U16 mV. Battery 3600 mV denotes external power.
function _hex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16)).slice(-2);
  return s.toUpperCase();
}

function _f32(b, i) {
  var v = new DataView(new ArrayBuffer(4));
  v.setUint8(0, b[i]); v.setUint8(1, b[i + 1]); v.setUint8(2, b[i + 2]); v.setUint8(3, b[i + 3]);
  return v.getFloat32(0);
}

function _u16(b, i) {
  return (b[i] << 8) | b[i + 1];
}

function _s16(b, i) {
  return (((b[i] << 8) | b[i + 1]) << 16) >> 16;
}

function _u32(b, i) {
  return ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
}

function _r2(v) {
  return Math.round(v * 100) / 100;
}

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 2) return out;
  var i = 0;
  while (i < bytes.length) {
    var t = bytes[i];
    if (t === 0x01 && i + 3 <= bytes.length) {
      out.temperature = _r2(_s16(bytes, i + 1) / 10);
      i += 3;
    } else if (t === 0x02 && i + 2 <= bytes.length) {
      out.humidity = bytes[i + 1];
      i += 2;
    } else if (t === 0x03 && i + 3 <= bytes.length) {
      out.light_level = _u16(bytes, i + 1);
      i += 3;
    } else if (t === 0x04 && i + 3 <= bytes.length) {
      out.pressure = _u16(bytes, i + 1);
      i += 3;
    } else if (t === 0x05 && i + 3 <= bytes.length) {
      out.voc_iaq = _u16(bytes, i + 1);
      i += 3;
    } else if (t === 0x08 && i + 3 <= bytes.length) {
      out.co2 = _u16(bytes, i + 1);
      i += 3;
    } else if (t === 0x13 && i + 5 <= bytes.length) {
      out.detection_count = _u32(bytes, i + 1);
      i += 5;
    } else if (t === 0x14 && i + 5 <= bytes.length) {
      out.occupied_duration = _u32(bytes, i + 1);
      i += 5;
    } else if (t === 0x50 && i + 5 <= bytes.length) {
      out.sound_minimum = _r2(_f32(bytes, i + 1));
      i += 5;
    } else if (t === 0x51 && i + 5 <= bytes.length) {
      out.sound_average = _r2(_f32(bytes, i + 1));
      i += 5;
    } else if (t === 0x52 && i + 5 <= bytes.length) {
      out.sound_maximum = _r2(_f32(bytes, i + 1));
      i += 5;
    } else if (t === 0x42 && i + 3 <= bytes.length) {
      out.battery_voltage = _u16(bytes, i + 1);
      i += 3;
    } else if (t === 0x41 && i + 2 <= bytes.length) {
      // KPI: battery status U8 (0 = ext power, 1-254 = 1.8-3.3V range, 255 = error)
      out.battery_status = bytes[i + 1];
      i += 2;
    } else if (t === 0x4D && i + 5 <= bytes.length) {
      // KPI: air intake fan runtime U32 seconds
      out.fan_runtime = _u32(bytes, i + 1);
      i += 5;
    } else {
      break;
    }
  }
  out.raw_uplink = _hex(bytes);
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
