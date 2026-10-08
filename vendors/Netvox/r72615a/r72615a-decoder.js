// Source: Netvox R72615A Wireless CO2/NH3/Noise/Temperature/Humidity/Wind Speed Sensor User Manual
// (netvox.com.tw/um/R72615A/R72615AUsermanual.pdf)
// Uplink FPort 0x06: Version(0x01) + DeviceType(0x09, R726 series) + ReportType + 8-byte NetvoxPayLoadData (big endian)
// Data layouts: ReportType 0x07 (CO2 + NH3 + Noise), ReportType 0x0C (Temperature + Humidity + WindSpeed)
// FPort 0x07 configure command responses (CmdID dispatch)
// Battery byte: bit0-6 = voltage * 0.1V, bit7 = 1 low voltage; 0x00 = DC power supply
// Sensor fields sent as 0xFFFF mean "sensor not connected or malfunction" -> null

function _hex(bytes) {
  var out = '';
  for (var i = 0; i < bytes.length; i++) out += ('0' + bytes[i].toString(16)).slice(-2);
  return out.toUpperCase();
}

function _u16(b, o) {
  return (b[o] << 8) | b[o + 1];
}

function _s16(b, o) {
  var v = _u16(b, o);
  return v >= 0x8000 ? v - 0x10000 : v;
}

function _version(byte) {
  return 'V' + (byte / 10).toFixed(1);
}

function _decode06(bytes) {
  var out = {};
  var rt = bytes[2];
  var p = bytes.slice(3);
  if (rt === 0x00) {
    // Version packet: SoftwareVersion(1B) + HardwareVersion(1B) + DateCode(4B, BCD) + Reserved(2B)
    out.software_version = _version(p[0]);
    out.hardware_version = _version(p[1]);
    var d = '';
    for (var i = 0; i < 4; i++) d += ('0' + ((p[2 + i] >> 4) * 10 + (p[2 + i] & 0x0F))).slice(-2);
    out.date_code = d.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
  } else if (rt === 0x07) {
    // Data packet: Battery(1B) + CO2(2B, 0.1ppm) + NH3(2B, 0.1ppm) + Noise(2B, 0.1dB) + Reserved(1B)
    out.battery_low = (p[0] & 0x80) ? 1 : 0;
    out.battery_voltage = (p[0] & 0x7F) / 10;
    var co2 = _u16(p, 1);
    out.co2 = co2 === 0xFFFF ? null : co2 / 10;
    var nh3 = _u16(p, 3);
    out.nh3 = nh3 === 0xFFFF ? null : nh3 / 10;
    var noise = _u16(p, 5);
    out.noise = noise === 0xFFFF ? null : noise / 10;
  } else if (rt === 0x0C) {
    // Data packet: Battery(1B) + Temperature(2B, signed 0.01C) + Humidity(2B, 0.01%)
    //              + WindSpeed(2B, 0.01m/s) + Reserved(1B)
    out.battery_low = (p[0] & 0x80) ? 1 : 0;
    out.battery_voltage = (p[0] & 0x7F) / 10;
    var tr = _u16(p, 1);
    out.temperature = tr === 0xFFFF ? null : _s16(p, 1) / 100;
    var hu = _u16(p, 3);
    out.humidity = hu === 0xFFFF ? null : hu / 100;
    var ws = _u16(p, 5);
    out.wind_speed = ws === 0xFFFF ? null : ws / 100;
  }
  return out;
}

function _decode07(bytes) {
  var out = {};
  var cmd = bytes[0];
  var p = bytes.slice(2);
  if (cmd === 0x81) {
    out.cmd = 'config_report_rsp';
    out.status = p[0];
  } else if (cmd === 0x82) {
    out.cmd = 'read_config_report_rsp';
    out.min_time = _u16(p, 0);
    out.max_time = _u16(p, 2);
  }
  return out;
}

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 3) return out;
  out.raw_uplink = _hex(bytes);
  var d = null;
  if (fPort === 6) d = _decode06(bytes);
  else if (fPort === 7) d = _decode07(bytes);
  if (d) {
    for (var k in d) out[k] = d[k];
  }
  return out;
}

function decodeUplink(input) {
  return { data: _decode(input.bytes, input.fPort) };
}
function Decode(fPort, bytes) {
  return _decode(bytes, fPort);
}
function Decoder(bytes, port) {
  return _decode(bytes, port);
}
