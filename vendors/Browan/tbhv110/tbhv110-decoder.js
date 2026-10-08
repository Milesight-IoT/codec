// Source: Browan Healthy Home Sensor (IAQ) Reference Manual TBHV110-915/TBHV110-868
// Section 4.1.2 Payload (port 103, 11 bytes) and Appendix Configuration Downlink
// Command Appx. 1 / Appx. 2 (port 204 config commands and 8-byte response).
function _hex(bytes) {
  var out = '';
  for (var i = 0; i < bytes.length; i++) {
    out += ('0' + bytes[i].toString(16)).slice(-2).toUpperCase();
  }
  return out;
}

function _decodeStatus(bytes) {
  var out = {};
  var status = bytes[0];
  out.trigger_event = (status & 0x01) ? 1 : 0;
  out.temperature_changed = (status & 0x10) ? 1 : 0;
  out.humidity_changed = (status & 0x20) ? 1 : 0;
  out.iaq_changed = (status & 0x40) ? 1 : 0;
  // Battery: bits[3:0], level 1-14, voltage V = (25 + level) / 10
  out.battery_voltage = (25 + (bytes[1] & 0x0f)) / 10;
  // On-board NTC temperature: bits[6:0], degC = value - 32
  out.board_temperature = (bytes[2] & 0x7f) - 32;
  // Relative humidity: bits[6:0], %
  out.humidity = bytes[3] & 0x7f;
  // CO2 equivalent estimate: uint16 little-endian (bytes4 low, bytes5 high), ppm.
  // Endianness per Browan Tabs family RM convention (TBDW100 RM 4.1.2 Time/Count,
  // TBAM100 Lux, TBSL100/TBWL100 intervals all little-endian).
  out.eco2 = (bytes[5] << 8) | bytes[4];
  // Breath VOC concentration estimate: uint16 little-endian, ppm (family RM convention)
  out.voc = (bytes[7] << 8) | bytes[6];
  // Indoor air quality index: uint16 little-endian, 0-500 (family RM convention)
  out.iaq = (bytes[9] << 8) | bytes[8];
  // Environment temperature from digital sensor: bits[6:0], degC = value - 32
  out.temperature = (bytes[10] & 0x7f) - 32;
  return out;
}

function _decodeConfigResponse(bytes) {
  // 8 bytes, 4 command+value pairs (see manual Appx. 2)
  var out = {};
  for (var i = 0; i + 1 < bytes.length; i += 2) {
    var cmd = bytes[i];
    var val = bytes[i + 1];
    if (cmd === 0x00) out.config_keep_alive_interval = val * 5;
    else if (cmd === 0x01) out.config_temperature_delta = val;
    else if (cmd === 0x02) out.config_humidity_delta = val;
    else if (cmd === 0x03) out.config_iaq_delta = val;
  }
  return out;
}

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length === 0) return out;
  out.raw_uplink = _hex(bytes);
  if (fPort === 103 && bytes.length >= 11) {
    var status = _decodeStatus(bytes);
    for (var k in status) out[k] = status[k];
  } else if (fPort === 204 && bytes.length >= 8) {
    var cfg = _decodeConfigResponse(bytes);
    for (var c in cfg) out[c] = cfg[c];
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
