// Netvox RA08BxxS all-in-one air quality sensor payload decoder.
// Source: Netvox RA08BxxS Series User Manual, section 5.1 Example of ReportDataCmd (FPort 0x06).
// Uplink frame: Version(1B) + DeviceType(1B, RA08B = 0xA0) + ReportType(1B) + NetvoxPayLoadData (fixed 8 bytes).
// ReportType 0x01 = Temperature + Humidity + CO2 + Occupy; 0x02 = AirPressure + Illuminance;
// 0x03 = PM2.5 + PM10 + TVOC; 0x05 = ThresholdAlarm (26 bits); 0x06 = H2S + NH3.
// 0xFFFF / 0xFFFFFF = unsupported detection item or sensor error (null).
function _hex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16).toUpperCase()).slice(-2);
  return s;
}
function _u16(b, o) { return (b[o] << 8) | b[o + 1]; }
function _s16(b, o) { var v = _u16(b, o); return v > 32767 ? v - 65536 : v; }
function _u24(b, o) { return (b[o] << 16) | (b[o + 1] << 8) | b[o + 2]; }
function _u32(b, o) { return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0; }
function _bit(v, n) { return (v >> n) & 1; }
function _bcd(b) { return ((b >> 4) * 10) + (b & 0x0f); }
function _dateStr(b, o) {
  var y = _bcd(b[o]) * 100 + _bcd(b[o + 1]);
  var m = _bcd(b[o + 2]);
  var d = _bcd(b[o + 3]);
  return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
}
function _battery(b) {
  return { voltage: b === 0 ? null : (b & 0x7f) / 10, low: b === 0 ? 0 : (b >> 7) & 1 };
}

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || !bytes.length) return out;
  out.raw_uplink = _hex(bytes);
  if (bytes.length < 3) return out;
  var rt = bytes[2];
  if (rt === 0x00 && bytes.length >= 9) {
    out.sw_version = bytes[3] / 10;
    out.hw_version = bytes[4];
    out.firmware_date = _dateStr(bytes, 5);
  } else if (rt === 0x01 && bytes.length >= 11) {
    var bat = _battery(bytes[3]);
    out.battery_voltage = bat.voltage;
    out.low_battery = bat.low;
    out.temperature = _u16(bytes, 4) === 0xffff ? null : _s16(bytes, 4) / 100;
    out.humidity = _u16(bytes, 6) === 0xffff ? null : _u16(bytes, 6) / 100;
    out.co2 = _u16(bytes, 8) === 0xffff ? null : _u16(bytes, 8);
    out.occupancy = bytes[10];
  } else if (rt === 0x02 && bytes.length >= 11) {
    var bat2 = _battery(bytes[3]);
    out.battery_voltage = bat2.voltage;
    out.low_battery = bat2.low;
    out.air_pressure = _u32(bytes, 4) === 0xffffffff ? null : _u32(bytes, 4) / 100;
    out.illuminance = _u24(bytes, 8) === 0xffffff ? null : _u24(bytes, 8);
  } else if (rt === 0x03 && bytes.length >= 11) {
    var bat3 = _battery(bytes[3]);
    out.battery_voltage = bat3.voltage;
    out.low_battery = bat3.low;
    out.pm2_5 = _u16(bytes, 4) === 0xffff ? null : _u16(bytes, 4);
    out.pm10 = _u16(bytes, 6) === 0xffff ? null : _u16(bytes, 6);
    out.tvoc = _u24(bytes, 8) === 0xffffff ? null : _u24(bytes, 8);
  } else if (rt === 0x05 && bytes.length >= 11) {
    var bat4 = _battery(bytes[3]);
    out.battery_voltage = bat4.voltage;
    out.low_battery = bat4.low;
    var thNames = [
      'temperature_high_alarm',
      'temperature_low_alarm',
      'humidity_high_alarm',
      'humidity_low_alarm',
      'co2_high_alarm',
      'co2_low_alarm',
      'air_pressure_high_alarm',
      'air_pressure_low_alarm',
      'illuminance_high_alarm',
      'illuminance_low_alarm',
      'pm2_5_high_alarm',
      'pm2_5_low_alarm',
      'pm10_high_alarm',
      'pm10_low_alarm',
      'tvoc_high_alarm',
      'tvoc_low_alarm',
      'hcho_high_alarm',
      'hcho_low_alarm',
      'o3_high_alarm',
      'o3_low_alarm',
      'co_high_alarm',
      'co_low_alarm',
      'h2s_high_alarm',
      'h2s_low_alarm',
      'nh3_high_alarm',
      'nh3_low_alarm'
    ];
    var th = _u32(bytes, 4);
    for (var n = 0; n < 26; n++) out[thNames[n]] = _bit(th, n);
  } else if (rt === 0x06 && bytes.length >= 11) {
    var bat5 = _battery(bytes[3]);
    out.battery_voltage = bat5.voltage;
    out.low_battery = bat5.low;
    out.h2s = _u16(bytes, 4) === 0xffff ? null : _u16(bytes, 4) / 100;
    out.nh3 = _u16(bytes, 6) === 0xffff ? null : _u16(bytes, 6) / 100;
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input && input.bytes, input && input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
