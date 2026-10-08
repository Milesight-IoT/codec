// Netvox RA02C wireless carbon monoxide (CO) detector payload decoder.
// Source: Netvox RA02C User Manual, section 5.1 Example of ReportDataCmd (FPort 0x06).
// Uplink frame: Version(1B) + DeviceType(1B, RA02C = 0x11) + ReportType(1B) + NetvoxPayLoadData.
// ReportType 0x00 = version packet; 0x01 = data packet (Battery + COAlarm + HighTempAlarm + Temperature).
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
  } else if (rt === 0x01 && bytes.length >= 8) {
    var bat = _battery(bytes[3]);
    out.battery_voltage = bat.voltage;
    out.low_battery = bat.low;
    out.co_alarm = bytes[4];
    out.high_temp_alarm = bytes[5];
    out.temperature = _u16(bytes, 6) === 0xffff ? null : _s16(bytes, 6) / 10;
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input && input.bytes, input && input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
