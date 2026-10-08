// Netvox RA07 series (RA0715/R72615/RA0715Y, DeviceType 0x05) environment sensor payload decoder.
// Source: Netvox RA0715_R72615_RA0715Y User Manual, section 5.1 Example of ReportDataCmd (FPort 0x06).
// Uplink frame: Version(1B) + DeviceType(1B) + ReportType(1B) + NetvoxPayLoadData (fixed 8 bytes).
// ReportType 0x07 = Battery + CO2 + NH3 + Noise; 0x0C = Battery + Temperature + Humidity + WindSpeed.
// 0xFFFF = sensor not connected (null). Battery 0x00 = DC powered (reported as null). ReportType 0xFFFF = unsupported device.
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
  } else if (rt === 0x07 && bytes.length >= 10) {
    var bat = _battery(bytes[3]);
    out.battery_voltage = bat.voltage;
    out.low_battery = bat.low;
    out.co2 = _u16(bytes, 4) === 0xffff ? null : _u16(bytes, 4) / 10;
    out.nh3 = _u16(bytes, 6) === 0xffff ? null : _u16(bytes, 6) / 10;
    out.noise = _u16(bytes, 8) === 0xffff ? null : _u16(bytes, 8) / 10;
  } else if (rt === 0x0c && bytes.length >= 10) {
    var bat2 = _battery(bytes[3]);
    out.battery_voltage = bat2.voltage;
    out.low_battery = bat2.low;
    out.temperature = _u16(bytes, 4) === 0xffff ? null : _s16(bytes, 4) / 100;
    out.humidity = _u16(bytes, 6) === 0xffff ? null : _u16(bytes, 6) / 100;
    out.wind_speed = _u16(bytes, 8) === 0xffff ? null : _u16(bytes, 8) / 100;
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input && input.bytes, input && input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
