// Source: Netvox R72616 Wireless Temperature/Humidity/PM2.5 Sensor User Manual
// (netvox.com.tw/um/R72616/R72616Usermanual.pdf)
// Uplink FPort 0x06: Version(0x01) + DeviceType(0x36) + ReportType + 8-byte NetvoxPayLoadData (big endian)
// Data layouts: ReportType 0x01 (Temperature + Humidity + PM2.5)
//               ReportType 0x12 (7-byte big-endian u56 ThresholdAlarm bitmap)
// FPort 0x07 configure / 0x0E global calibrate / 0x10 sensor alarm threshold responses
// Battery byte: bit0-6 = voltage * 0.1V, bit7 = 1 low voltage; 0x00 = DC power supply
// RT 0x12 bitmap bits (per manual): Bit0 low PM2.5, Bit1 high PM2.5,
// Bit36 low temperature, Bit37 high temperature, Bit38 low humidity, Bit39 high humidity

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
    //              + PM2.5(2B, 1ug/m3) + Reserved(1B)
    out.battery_low = (p[0] & 0x80) ? 1 : 0;
    out.battery_voltage = (p[0] & 0x7F) / 10;
    out.temperature = _s16(p, 1) / 100;
    out.humidity = _u16(p, 3) / 100;
    out.pm2_5 = _u16(p, 5);
  } else if (rt === 0x12) {
    // Alarm packet: Battery(1B) + ThresholdAlarm (7-byte big-endian u56 bitmap) 
    out.battery_low = (p[0] & 0x80) ? 1 : 0;
    out.battery_voltage = (p[0] & 0x7F) / 10;
    // u56 big endian: bit n lives in byte p[1 + (6 - floor(n / 8))], position n % 8
    out.low_pm2_5_alarm = (p[7] & 0x01) ? 1 : 0;
    out.high_pm2_5_alarm = (p[7] & 0x02) ? 1 : 0;
    out.low_temperature_alarm = (p[3] & 0x10) ? 1 : 0;
    out.high_temperature_alarm = (p[3] & 0x20) ? 1 : 0;
    out.low_humidity_alarm = (p[3] & 0x40) ? 1 : 0;
    out.high_humidity_alarm = (p[3] & 0x80) ? 1 : 0;
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

function _decode0E(bytes) {
  var out = {};
  var cmd = bytes[0];
  var sensor = bytes[1];
  out.calibrate_sensor = sensor === 0x01 ? 'Temperature sensor' : sensor === 0x02 ? 'Humidity sensor'
    : sensor === 0x04 ? 'PM2.5 sensor' : sensor;
  var p = bytes.slice(2);
  if (cmd === 0x81) {
    out.cmd = 'set_global_calibrate_rsp';
    out.calibrate_channel = p[0];
    out.status = p[1];
  } else if (cmd === 0x82) {
    out.cmd = 'get_global_calibrate_rsp';
    out.calibrate_channel = p[0];
    out.calibrate_multiplier = _u16(p, 1);
    out.calibrate_divisor = _u16(p, 3);
    out.calibrate_delt_value = _s16(p, 5);
  }
  return out;
}

function _decode10(bytes) {
  var out = {};
  var cmd = bytes[0];
  var p = bytes.slice(1);
  if (cmd === 0x81) {
    out.cmd = 'set_sensor_alarm_threshold_rsp';
    out.status = p[0];
  } else if (cmd === 0x82) {
    out.cmd = 'get_sensor_alarm_threshold_rsp';
    out.alarm_channel = p[0];
    var sensor = p[1];
    out.alarm_sensor = sensor === 0x01 ? 'Temperature' : sensor === 0x02 ? 'Humidity'
      : sensor === 0x06 ? 'PM2.5' : sensor;
    out.alarm_high_threshold = (((p[2] << 24) | (p[3] << 16) | (p[4] << 8) | p[5]) >>> 0);
    out.alarm_low_threshold = (((p[6] << 24) | (p[7] << 16) | (p[8] << 8) | p[9]) >>> 0);
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
  else if (fPort === 14) d = _decode0E(bytes);
  else if (fPort === 16) d = _decode10(bytes);
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
