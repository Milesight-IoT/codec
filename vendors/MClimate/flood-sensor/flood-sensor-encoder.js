// Source: MClimate Flood Sensor LoRaWAN official documentation (command tables only)
// https://docs.mclimate.eu/mclimate-lorawan-devices/devices/mclimate-flood-sensor-lorawan
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
  if (obj.keep_alive_period !== undefined && obj.keep_alive_period !== null) {
    var p = Math.round(obj.keep_alive_period) & 0xFFFF;
    bytes.push(0x05, (p >> 8) & 0xFF, p & 0xFF);
  }
  if (obj.flood_alarm_duration !== undefined && obj.flood_alarm_duration !== null) {
    // Resolution 10 s, command 0x04
    bytes.push(0x04, Math.round(obj.flood_alarm_duration / 10) & 0xFF);
  }
  if (obj.flood_event_send_period !== undefined && obj.flood_event_send_period !== null) {
    // Minutes, command 0x08
    bytes.push(0x08, Math.round(obj.flood_event_send_period) & 0xFF);
  }
  if (obj.uplink_confirmed !== undefined && obj.uplink_confirmed !== null) {
    // Command 0x11 (hex)
    bytes.push(0x11, obj.uplink_confirmed ? 0x01 : 0x00);
  }
  if (obj.flood_event_uplink_confirmed !== undefined && obj.flood_event_uplink_confirmed !== null) {
    // Command 0x13 (hex)
    bytes.push(0x13, obj.flood_event_uplink_confirmed ? 0x01 : 0x00);
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
