// Source: Sontay RF-LW-GP1 LoRaWAN Gauge Pressure Sensor (OEM of Synetica enLink Status-GP, firmware FW-STS-GP)
// Sontay datasheet / user guide: https://www.sontay.com/en-gb/products/smart-devices/lorawan/rf-lw-gp1-lorawan-gauge-pressure-sensor/
// Synetica enLink uplink payload spec (TLV, fPort 1): 0x32 gauge pressure F32 Pa, 0x33 sensor temperature S16 / 100 degC,
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
    if (t === 0x32 && i + 5 <= bytes.length) {
      out.gauge_pressure = _r2(_f32(bytes, i + 1));
      i += 5;
    } else if (t === 0x33 && i + 3 <= bytes.length) {
      out.sensor_temperature = _r2(_s16(bytes, i + 1) / 100);
      i += 3;
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
