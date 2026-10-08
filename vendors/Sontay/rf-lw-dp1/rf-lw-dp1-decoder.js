// Source: Sontay RF-LW-DP1 LoRaWAN Differential Pressure Sensor (OEM of Synetica enLink Status-DP, firmware FW-STS-DP)
// Sontay datasheet / user guide: https://www.sontay.com/en-gb/products/smart-devices/lorawan/rf-lw-dp1-lorawan-pressure-sensing/
// Synetica enLink uplink payload spec (TLV, fPort 1): 0x2C differential pressure F32 Pa (range +/- 5000 Pa),
// 0x2D airflow F32 m/s (Status-DP/AF shared firmware option), KPI 0x42 battery voltage U16 mV.
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
    if (t === 0x2C && i + 5 <= bytes.length) {
      out.differential_pressure = _r2(_f32(bytes, i + 1));
      i += 5;
    } else if (t === 0x2D && i + 5 <= bytes.length) {
      out.air_velocity = _r2(_f32(bytes, i + 1));
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
