// Source: Sontay RF-LW-VZ LoRaWAN Water Shut-Off Valve
// OEM hardware: MClimate T-Valve LoRaWAN, payload per
// https://docs.mclimate.eu/mclimate-lorawan-devices/devices/mclimate-t-valve-lorawan/t-valve-lorawan-communication-protocol/keep-alive.md
// Uplinks use fPort 2. Short keep-alive is 2 bytes (temperatures + valve state),
// long keep-alive is 5 bytes (status flags, timings, battery).

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || !bytes.length) return out;
  var hex = '';
  for (var i = 0; i < bytes.length; i++) hex += ('0' + bytes[i].toString(16).toUpperCase()).slice(-2);
  out.raw_uplink = hex;

  if (bytes.length === 2) {
    out.water_temperature = bytes[0] / 2;
    out.temperature = Math.round((((bytes[1] & 0x7f) - 20) / 2) * 100) / 100;
    out.valve_state = (bytes[1] >> 7) & 1;
  } else if (bytes.length === 5) {
    out.send_reason = (bytes[0] >> 5) & 0x07;
    out.dangerous_battery_voltage = (bytes[0] >> 4) & 1;
    out.box_tamper = (bytes[0] >> 3) & 1;
    out.flood_sensor_wire_error = (bytes[0] >> 2) & 1;
    out.flood_detected = (bytes[0] >> 1) & 1;
    out.magnet_detected = bytes[0] & 1;
    out.alarm_verified = (bytes[1] >> 7) & 1;
    out.manual_open_enabled = (bytes[1] >> 6) & 1;
    out.manual_close_enabled = (bytes[1] >> 5) & 1;
    out.firmware_version = bytes[1] & 0x1f;
    out.valve_close_time = bytes[2];
    out.valve_open_time = bytes[3];
    out.battery_voltage = Math.round((bytes[4] * 8 + 1600) / 1000 * 1000) / 1000;
  }

  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
