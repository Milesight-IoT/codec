// Source: Netvox R718CN User Manual (shared R718CK/CT/CN/CR manual, N-type thermocouple), "5. Data Report" (FPort 0x06 uplink, FPort 0x07 configuration).
// Uplink data frame: Version(1B) + DeviceType(1B, 0x93 for R718CN) + ReportType(1B) + 8-byte payload.
//   ReportType 0x00 = version packet, 0x01 = data packet (Battery + Temperature + ThresholdAlarm).
//   Battery: low 7 bits * 0.1V, bit7 = low voltage flag. Temperature: signed 2B * 0.1 degC.
//   ThresholdAlarm (1B): bit0 = low temperature alarm, bit1 = high temperature alarm.
// FPort 0x07: CmdID(1B) + DeviceType(1B) + payload. 0x81 = ConfigReportRsp (status), 0x82 = ReadConfigReportRsp
//   (MinTime + MaxTime + BatteryChange + TemperatureChange, unit 0.1 degC).

function _hexStr(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16)).slice(-2);
  return s;
}

function _int16(hi, lo) {
  var v = (hi << 8) | lo;
  if (v > 0x7fff) v -= 0x10000;
  return v;
}

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 3) return out;
  out.raw_uplink = _hexStr(bytes).toUpperCase();

  if (fPort === 6) {
    var reportType = bytes[2];
    if (reportType === 0x00 && bytes.length >= 9) {
      out.software_version = Math.floor(bytes[3] / 10) + '.' + (bytes[3] % 10);
      out.hardware_version = Math.floor(bytes[4] / 10) + '.' + (bytes[4] % 10);
      out.date_code = _hexStr(bytes.slice(5, 9)).replace(/^(....)(..)(..)$/, '$1.$2.$3');
    } else if (reportType === 0x01 && bytes.length >= 7) {
      out.battery_voltage = Math.round((bytes[3] & 0x7f) * 0.1 * 10) / 10;
      out.battery_low = (bytes[3] & 0x80) ? 1 : 0;
      out.temperature = Math.round(_int16(bytes[4], bytes[5]) * 0.1 * 10) / 10;
      out.low_temperature_alarm = (bytes[6] & 0x01) ? 1 : 0;
      out.high_temperature_alarm = (bytes[6] & 0x02) ? 1 : 0;
    }
  } else if (fPort === 7) {
    var cmdId = bytes[0];
    if (cmdId === 0x81 && bytes.length >= 3) {
      out.config_status = bytes[2] === 0 ? 0 : 1;
    } else if (cmdId === 0x82 && bytes.length >= 9) {
      out.min_time = (bytes[2] << 8) | bytes[3];
      out.max_time = (bytes[4] << 8) | bytes[5];
      out.battery_change = Math.round(bytes[6] * 0.1 * 10) / 10;
      out.temperature_change = Math.round(_int16(bytes[7], bytes[8]) * 0.1 * 10) / 10;
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
