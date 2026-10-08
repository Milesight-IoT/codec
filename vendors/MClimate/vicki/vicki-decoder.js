// Source: MClimate Vicki LoRaWAN official documentation (payload formats only)
// https://docs.mclimate.eu/mclimate-lorawan-devices/devices/mclimate-vicki-lorawan
// Retrieved 2026-10-08. Clean-room implementation, no vendor decoder code referenced.
//
// Uplink (fPort 2): 9-byte keep-alive frame starting with 0x01 (f.w. <= 3.4)
// or 0x81 (f.w. >= 3.5), optionally preceded/followed by command responses
// (manual documents responses with the keep-alive omitted for clarity).
function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 2) return out;
  out.raw_uplink = _toHex(bytes);
  _decodeSegments(bytes, 0, out);
  return out;
}

function _decodeSegments(bytes, i, out) {
  while (i < bytes.length) {
    var cmd = bytes[i];
    if ((cmd === 0x01 || cmd === 0x81) && i + 8 < bytes.length) {
      _decodeKeepAlive(bytes, i, out);
      i += 9;
    } else if (cmd === 0x04 && i + 2 < bytes.length) {
      // Read firmware & hardware version response
      out.hardware_version = (bytes[i + 1] >> 4) + '.' + (bytes[i + 1] & 0x0F);
      out.firmware_version = (bytes[i + 2] >> 4) + '.' + (bytes[i + 2] & 0x0F);
      i += 3;
    } else if (cmd === 0x12 && i + 1 < bytes.length) {
      // Get keep-alive period response, minutes
      out.keep_alive_period = bytes[i + 1];
      i += 2;
    } else if (cmd === 0x15 && i + 2 < bytes.length) {
      // Get temperature range response, Celsius degrees
      out.min_temperature = bytes[i + 1];
      out.max_temperature = bytes[i + 2];
      i += 3;
    } else if (cmd === 0x18 && i + 1 < bytes.length) {
      // Get operational mode response
      out.operational_mode = bytes[i + 1];
      i += 2;
    } else if (cmd === 0x52 && i + 2 < bytes.length) {
      // Get target temperature response, Tt/10 with 0.1 deg resolution
      out.target_temperature = Math.round(((bytes[i + 1] << 8) | bytes[i + 2]) / 10 * 100) / 100;
      i += 3;
    } else if (cmd === 0x14 && i + 1 < bytes.length) {
      // Get child lock response
      out.child_lock = bytes[i + 1] === 0x01 ? 1 : 0;
      i += 2;
    } else if (cmd === 0x28 && i + 1 < bytes.length) {
      // Manual target temperature change (user rotated the ring), Celsius
      out.target_temperature = bytes[i + 1];
      i += 2;
    } else {
      i += 1;
    }
  }
  return out;
}

function _decodeKeepAlive(bytes, i, out) {
  // byte0: 0x01 = f.w. <= 3.4, 0x81 = f.w. >= 3.5
  var fw35 = bytes[i] === 0x81;
  out.target_temperature = bytes[i + 1];
  var raw = bytes[i + 2];
  out.temperature = fw35
    ? Math.round((raw - 28.33333) / 5.66666 * 100) / 100
    : Math.round((raw * 165 / 256 - 40) * 100) / 100;
  out.humidity = Math.round(bytes[i + 3] * 100 / 256 * 100) / 100;
  var motorPosition = bytes[i + 4] | ((bytes[i + 6] >> 4) << 8);
  var motorRange = bytes[i + 5] | ((bytes[i + 6] & 0x0F) << 8);
  out.motor_position = motorPosition;
  out.motor_range = motorRange;
  if (motorRange > 0) {
    out.motor_position_percent = Math.round(motorPosition / motorRange * 10000) / 100;
  }
  out.battery_voltage = Math.round((2 + (bytes[i + 7] >> 4) * 0.1) * 100) / 100;
  out.open_window_detected = (bytes[i + 7] & 0x08) ? 1 : 0;
  out.motor_current_high = (bytes[i + 7] & 0x04) ? 1 : 0;
  out.motor_current_low = (bytes[i + 7] & 0x02) ? 1 : 0;
  out.temperature_sensor_failure = (bytes[i + 7] & 0x01) ? 1 : 0;
  out.child_lock = (bytes[i + 8] & 0x80) ? 1 : 0;
  out.motor_calibration_failed = (bytes[i + 8] & 0x40) ? 1 : 0;
  out.attached_to_backplate = (bytes[i + 8] & 0x20) ? 1 : 0;
  out.online = (bytes[i + 8] & 0x10) ? 1 : 0;
  out.anti_freeze_active = (bytes[i + 8] & 0x08) ? 1 : 0;
  out.d2d_communication_ok = (bytes[i + 8] & 0x04) ? 1 : 0;
  out.battery_low = (bytes[i + 8] & 0x02) ? 1 : 0;
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
