// Source: MClimate T-Valve LoRaWAN official documentation (payload formats only)
// https://docs.mclimate.eu/mclimate-lorawan-devices/devices/mclimate-t-valve-lorawan
// Retrieved 2026-10-08. Clean-room implementation, no vendor decoder code referenced.
//
// Uplink (fPort 2): Short keep-alive (2 bytes) or Long keep-alive (5 bytes),
// optionally followed by command responses. A frame whose first byte is a
// known GET-response command code at the exact response length is parsed as a
// standalone response (the manual documents responses without the keep-alive).
function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 2) return out;
  out.raw_uplink = _toHex(bytes);
  var i = 0;
  if (_isStandaloneResponse(bytes)) {
    _decodeResponses(bytes, 0, out);
    return out;
  }
  if (bytes.length >= 2 && bytes.length < 5) {
    // Short keep-alive (2 bytes), possibly followed by command responses
    out.water_temperature = bytes[0] / 2;
    out.valve_open = (bytes[1] & 0x80) ? 1 : 0;
    out.ambient_temperature = ((bytes[1] & 0x7F) - 20) / 2;
    i = 2;
  } else if (bytes.length >= 5) {
    // Long keep-alive
    out.send_reason = (bytes[0] >> 5) & 0x07;
    out.battery_low = (bytes[0] & 0x10) ? 1 : 0;
    out.box_tamper = (bytes[0] & 0x08) ? 1 : 0;
    out.flood_wire_fault = (bytes[0] & 0x04) ? 1 : 0;
    out.flood_detected = (bytes[0] & 0x02) ? 1 : 0;
    out.magnet_detected = (bytes[0] & 0x01) ? 1 : 0;
    out.alarm_verified = (bytes[1] & 0x80) ? 1 : 0;
    out.manual_open_enabled = (bytes[1] & 0x40) ? 1 : 0;
    out.manual_close_enabled = (bytes[1] & 0x20) ? 1 : 0;
    out.firmware_version = String(bytes[1] & 0x1F);
    out.valve_close_time = bytes[2];
    out.valve_open_time = bytes[3];
    out.battery_voltage = Math.round((bytes[4] * 8 + 1600)) / 1000;
    i = 5;
  }
  _decodeResponses(bytes, i, out);
  return out;
}

// Response lengths by command code: 0x0E:5, 0x0F:2, 0x10:2, 0x11:2, 0x12:2,
// 0x13:2, 0x16:2, 0x18:2, 0x1A:3, 0xA4:2
function _isStandaloneResponse(bytes) {
  var len = bytes.length;
  if (bytes[0] === 0x0E && len === 5) return true;
  if (bytes[0] === 0x1A && len === 3) return true;
  if ((bytes[0] === 0x0F || bytes[0] === 0x10 || bytes[0] === 0x11 || bytes[0] === 0x12 ||
       bytes[0] === 0x13 || bytes[0] === 0x16 || bytes[0] === 0x18 || bytes[0] === 0xA4) && len === 2) return true;
  return false;
}

function _decodeResponses(bytes, i, out) {
  var regions = ['EU868', 'AS923', 'AU915', 'US915'];
  while (i < bytes.length) {
    var cmd = bytes[i];
    if (cmd === 0x0E && i + 4 < bytes.length) {
      // Get open/close extended cycle response, minutes (16-bit each)
      out.valve_open_time = (bytes[i + 1] << 8) | bytes[i + 2];
      out.valve_close_time = (bytes[i + 3] << 8) | bytes[i + 4];
      i += 5;
    } else if (cmd === 0x1A && i + 2 < bytes.length) {
      // Watch-dog parameters response (not exposed as fields)
      i += 3;
    } else if (cmd === 0x0F && i + 1 < bytes.length) {
      out.emergency_openings_left = bytes[i + 1];
      i += 2;
    } else if (cmd === 0x10 && i + 1 < bytes.length) {
      // Flood alarm time response, resolution 10 s
      out.flood_alarm_duration = bytes[i + 1] * 10;
      i += 2;
    } else if (cmd === 0x11 && i + 1 < bytes.length) {
      // Allowed working voltage, mV = XX * 8 + 1600
      out.min_working_voltage = Math.round((bytes[i + 1] * 8 + 1600)) / 1000;
      i += 2;
    } else if (cmd === 0x12 && i + 1 < bytes.length) {
      out.keep_alive_period = bytes[i + 1];
      i += 2;
    } else if (cmd === 0x13 && i + 1 < bytes.length) {
      out.flood_sensor_enabled = (bytes[i + 1] & 0x01) ? 1 : 0;
      i += 2;
    } else if (cmd === 0x16 && i + 1 < bytes.length) {
      // Join retry period, T [s] = XX * 5
      out.join_retry_period = bytes[i + 1] * 5;
      i += 2;
    } else if (cmd === 0x18 && i + 1 < bytes.length) {
      out.uplink_confirmed = bytes[i + 1] === 0x01 ? 1 : 0;
      i += 2;
    } else if (cmd === 0xA4 && i + 1 < bytes.length) {
      var r = bytes[i + 1];
      out.lorawan_region = r < regions.length ? regions[r] : 'UNKNOWN';
      i += 2;
    } else {
      i += 1;
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }

function _toHex(bytes) {
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    hex += ('0' + bytes[i].toString(16).toUpperCase()).slice(-2);
  }
  return hex;
}
