// Source: Netvox R711 Wireless Temperature and Humidity Sensor User Manual (netvox.com.tw/um/R711/R711Usermanual.pdf)
// Uplink FPort 0x06: Version(0x01) + DeviceType(0x01) + ReportType + 8-byte NetvoxPayLoadData (big endian)
// FPort 0x07: configure command responses (CmdID dispatch)
// Battery byte: bit0-6 = voltage * 0.1V, bit7 = 1 low voltage
// Temperature is signed 16-bit * 0.01 degC (2's complement when negative)

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
  } else if (rt === 0x01) {
    // Data packet: Battery(1B) + Temperature(2B, signed 0.01C) + Humidity(2B, 0.01%)
    //              + ThresholdAlarm(1B: bit0 low temp, bit1 high temp, bit2 low humi, bit3 high humi) + Reserved(2B)
    out.battery_low = (p[0] & 0x80) ? 1 : 0;
    out.battery_voltage = (p[0] & 0x7F) / 10;
    out.temperature = _s16(p, 1) / 100;
    out.humidity = _u16(p, 3) / 100;
    out.low_temperature_alarm = (p[5] & 0x01) ? 1 : 0;
    out.high_temperature_alarm = (p[5] & 0x02) ? 1 : 0;
    out.low_humidity_alarm = (p[5] & 0x04) ? 1 : 0;
    out.high_humidity_alarm = (p[5] & 0x08) ? 1 : 0;
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
    out.battery_change = (p[4] & 0x7F) / 10;
    out.temperature_change = _u16(p, 5) / 100;
    out.humidity_change = _u16(p, 7) / 100;
  }
  return out;
}

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 3) return out;
  out.raw_uplink = _hex(bytes);
  if (fPort === 6) {
    var d = _decode06(bytes);
    for (var k in d) out[k] = d[k];
  } else if (fPort === 7) {
    var c = _decode07(bytes);
    for (var k2 in c) out[k2] = c[k2];
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
