// Source: MClimate Flood Sensor LoRaWAN official documentation (payload formats only)
// https://docs.mclimate.eu/mclimate-lorawan-devices/devices/mclimate-flood-sensor-lorawan
// Retrieved 2026-10-08. Clean-room implementation, no vendor decoder code referenced.
//
// Uplink (fPort 2): 3-byte keep-alive / event frame, optionally followed by
// command responses, or a 4-byte variant whose last byte is the firmware
// version (read device parameters response, f.w. < 1.5).
function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 2) return out;
  out.raw_uplink = _toHex(bytes);
  var i = 0;
  // Keep-alive / event frame: byte0 bits 7:5 = message type (000/010/100),
  // reserved bits 4,2,0 must be 0; this also rejects bare response frames
  // such as 0x06/0x09/0x12/0x1B whose command codes set those reserved bits.
  var type = (bytes[0] >> 5) & 0x07;
  if (bytes.length >= 3 && (bytes[0] & 0x15) === 0 && type !== 0x05 && type !== 0x06 && type !== 0x07) {
    out.message_type = type;
    out.flood_detected = (bytes[0] & 0x02) ? 1 : 0;
    out.box_tamper = (bytes[0] & 0x08) ? 1 : 0;
    out.battery_voltage = Math.round(bytes[1] * 16) / 1000;
    var t = bytes[2] & 0x7F;
    out.temperature = (bytes[2] & 0x80) ? -t : t;
    i = 3;
    if (bytes.length === 4) {
      // Read device parameters response (f.w. < 1.5): byte3 = firmware version
      out.firmware_version = (bytes[3] >> 4) + '.' + (bytes[3] & 0x0F);
      i = 4;
    }
  }
  _decodeResponses(bytes, i, out);
  return out;
}

function _decodeResponses(bytes, i, out) {
  var regions = ['EU868', 'AS923', 'AU915', 'US915'];
  while (i < bytes.length) {
    var cmd = bytes[i];
    if (cmd === 0x07 && i + 2 < bytes.length) {
      // Read firmware & hardware version response (f.w. >= 1.5)
      out.hardware_version = (bytes[i + 1] >> 4) + '.' + (bytes[i + 1] & 0x0F);
      out.firmware_version = (bytes[i + 2] >> 4) + '.' + (bytes[i + 2] & 0x0F);
      i += 3;
    } else if (cmd === 0x12 && i + 2 < bytes.length) {
      // Get keep-alive period response, minutes
      out.keep_alive_period = (bytes[i + 1] << 8) | bytes[i + 2];
      i += 3;
    } else if (cmd === 0x1D && i + 2 < bytes.length) {
      // Watch-dog parameters response (not exposed as fields)
      i += 3;
    } else if (cmd === 0x06 && i + 1 < bytes.length) {
      // Get alarm duration response, resolution 10 s
      out.flood_alarm_duration = bytes[i + 1] * 10;
      i += 2;
    } else if (cmd === 0x09 && i + 1 < bytes.length) {
      // Get flood event send period response, minutes
      out.flood_event_send_period = bytes[i + 1];
      i += 2;
    } else if (cmd === 0x14 && i + 1 < bytes.length) {
      out.flood_event_uplink_confirmed = bytes[i + 1] === 0x01 ? 1 : 0;
      i += 2;
    } else if (cmd === 0x1B && i + 1 < bytes.length) {
      out.uplink_confirmed = bytes[i + 1] === 0x01 ? 1 : 0;
      i += 2;
    } else if (cmd === 0x19 && i + 1 < bytes.length) {
      // Join retry period response, T [s] = XX * 5
      out.join_retry_period = bytes[i + 1] * 5;
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
