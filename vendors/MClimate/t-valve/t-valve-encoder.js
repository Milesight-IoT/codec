// Source: MClimate T-Valve LoRaWAN official documentation (command tables only)
// https://docs.mclimate.eu/mclimate-lorawan-devices/devices/mclimate-t-valve-lorawan
// Retrieved 2026-10-08. Clean-room implementation.
// Structured downlink fields are appended after any raw payload; raw always wins.
function _hexToBytes(hex) {
  hex = String(hex).replace(/[^0-9a-fA-F]/g, '');
  if (hex.length % 2) hex = '0' + hex;
  var out = [];
  for (var i = 0; i < hex.length; i += 2) out.push(parseInt(hex.substr(i, 2), 16));
  return out;
}
function _encodeRaw(obj) {
  var raw = obj && (obj.raw_downlink !== undefined ? obj.raw_downlink : obj);
  if (typeof raw !== 'string' || !raw) return { bytes: [], fPort: 1 };
  var parts = raw.split(':');
  var hex = parts[0];
  var port = parts[1] ? parseInt(parts[1], 10) : 1;
  return { bytes: _hexToBytes(hex), fPort: port };
}
function _encodeStructured(obj) {
  var bytes = [];
  if (!obj) return bytes;
  if (obj.valve_open !== undefined && obj.valve_open !== null) {
    // General valve state control, command 0x0C (f.w. >= 1.6)
    bytes.push(0x0C, obj.valve_open ? 0x01 : 0x00);
  }
  if (obj.keep_alive_period !== undefined && obj.keep_alive_period !== null) {
    // Minutes, command 0x07
    bytes.push(0x07, Math.round(obj.keep_alive_period) & 0xFF);
  }
  if (obj.flood_alarm_duration !== undefined && obj.flood_alarm_duration !== null) {
    // Resolution 10 s, command 0x06
    bytes.push(0x06, Math.round(obj.flood_alarm_duration / 10) & 0xFF);
  }
  return bytes;
}
function Encode(fPort, obj) {
  var r = _encodeRaw(obj);
  return r.bytes.length ? r.bytes : _encodeStructured(obj);
}
function Encoder(obj, port) {
  var r = _encodeRaw(obj);
  return r.bytes.length ? r.bytes : _encodeStructured(obj);
}
function encodeDownlink(input) {
  var r = _encodeRaw(input && input.data);
  return { bytes: r.bytes.length ? r.bytes : _encodeStructured(input && input.data), fPort: r.fPort };
}
