// Netvox R900NAB607T4O (6 x 75A clamp-on CT + 4 NTC + digital output) wireless current sensor payload decoder.
// Source: Netvox R900NAB Series User Manual, section 5.1 Example of ReportDataCmd (FPort 0x16).
// Uplink frame: Version(1B) + DeviceType(2B, R900NAB 6T4O = 0x0105) + ReportType(1B) + NetvoxPayLoadData.
// ReportType 0x00 = version packet; 0x01 = data packet (Battery + Current1-6 + Temperature1-4 + ThresholdAlarm + ShockTamperAlarm).
// 0xFFFFFF (current) / 0xFFFF (temperature) = no sensor connected. Battery 0x00 = DC powered.
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
  if (bytes.length < 4) return out;
  var rt = bytes[3];
  if (rt === 0x00 && bytes.length >= 10) {
    out.sw_version = bytes[4] / 10;
    out.hw_version = bytes[5];
    out.firmware_date = _dateStr(bytes, 6);
  } else if (rt === 0x01 && bytes.length >= 35) {
    var bat = _battery(bytes[4]);
    out.battery_voltage = bat.voltage;
    out.low_battery = bat.low;
    var curNames = ['current1', 'current2', 'current3', 'current4', 'current5', 'current6'];
    for (var c = 0; c < 6; c++) {
      var v = _u24(bytes, 5 + c * 3);
      out[curNames[c]] = v === 0xffffff ? null : v;
    }
    var tempNames = ['temperature1', 'temperature2', 'temperature3', 'temperature4'];
    for (var t = 0; t < 4; t++) {
      out[tempNames[t]] = _u16(bytes, 23 + t * 2) === 0xffff ? null : _s16(bytes, 23 + t * 2) / 10;
    }
    var thNames = [
      'current1_low_alarm',
      'current1_high_alarm',
      'current2_low_alarm',
      'current2_high_alarm',
      'current3_low_alarm',
      'current3_high_alarm',
      'current4_low_alarm',
      'current4_high_alarm',
      'current5_low_alarm',
      'current5_high_alarm',
      'current6_low_alarm',
      'current6_high_alarm',
      'temperature1_low_alarm',
      'temperature1_high_alarm',
      'temperature2_low_alarm',
      'temperature2_high_alarm',
      'temperature3_low_alarm',
      'temperature3_high_alarm',
      'temperature4_low_alarm',
      'temperature4_high_alarm'
    ];
    var th = _u24(bytes, 31);
    for (var n = 0; n < 20; n++) out[thNames[n]] = _bit(th, n);
    out.shock_tamper_alarm = bytes[34];
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input && input.bytes, input && input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
