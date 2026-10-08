// Source: Netvox R718A01 User Manual, "5. Data Report" (FPort 0x06 uplink, FPort 0x07 configuration, FPort 0x0C data storage).
// Uplink data frame: Version(1B) + DeviceType(1B, 0x0B for R718A01) + ReportType(1B) + 8-byte payload.
//   ReportType 0x00 = version packet, 0x01 = data packet (Battery + Temperature + Humidity).
//   Battery: low 7 bits * 0.1V, bit7 = low voltage flag. Temperature: signed 2B * 0.01 degC. Humidity: 2B * 0.01%.
// FPort 0x07: CmdID(1B) + DeviceType(1B) + payload. 0x81 = ConfigReportRsp (status), 0x82 = ReadConfigReportRsp.
// FPort 0x0C: ReadBackUpDataRsp (0x81): ResendUpLinkCounter(4B) + Status(1B) + Temperature(2B) + Humidity(2B).

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
    } else if (reportType === 0x01 && bytes.length >= 8) {
      out.battery_voltage = Math.round((bytes[3] & 0x7f) * 0.1 * 10) / 10;
      out.battery_low = (bytes[3] & 0x80) ? 1 : 0;
      out.temperature = Math.round(_int16(bytes[4], bytes[5]) * 0.01 * 100) / 100;
      out.humidity = Math.round(((bytes[6] << 8) | bytes[7]) * 0.01 * 100) / 100;
    }
  } else if (fPort === 7) {
    var cmdId = bytes[0];
    if (cmdId === 0x81 && bytes.length >= 3) {
      out.config_status = bytes[2] === 0 ? 0 : 1;
    } else if (cmdId === 0x82 && bytes.length >= 11) {
      out.min_time = (bytes[2] << 8) | bytes[3];
      out.max_time = (bytes[4] << 8) | bytes[5];
      out.battery_change = Math.round(bytes[6] * 0.1 * 10) / 10;
      out.temperature_change = Math.round(_int16(bytes[7], bytes[8]) * 0.01 * 100) / 100;
      out.humidity_change = Math.round(((bytes[9] << 8) | bytes[10]) * 0.01 * 100) / 100;
    }
  } else if (fPort === 12) {
    if (bytes[0] === 0x81 && bytes.length >= 10) {
      out.resend_uplink_counter = ((bytes[1] << 24) | (bytes[2] << 16) | (bytes[3] << 8) | bytes[4]) >>> 0;
      out.backup_data_found = bytes[5] === 0 ? 0 : 1;
      out.temperature = Math.round(_int16(bytes[6], bytes[7]) * 0.01 * 100) / 100;
      out.humidity = Math.round(((bytes[8] << 8) | bytes[9]) * 0.01 * 100) / 100;
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
