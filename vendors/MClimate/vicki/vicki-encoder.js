// Source: MClimate Vicki LoRaWAN official documentation (command tables only)
// https://docs.mclimate.eu/mclimate-lorawan-devices/devices/mclimate-vicki-lorawan
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
  if (obj.target_temperature !== undefined && obj.target_temperature !== null) {
    // Set target temperature with 0.1 degC resolution, command 0x51: Tt = t * 10
    var tt = Math.round(obj.target_temperature * 10) & 0xFFFF;
    bytes.push(0x51, (tt >> 8) & 0xFF, tt & 0xFF);
  }
  if (obj.child_lock !== undefined && obj.child_lock !== null) {
    // Command 0x07
    bytes.push(0x07, obj.child_lock ? 0x01 : 0x00);
  }
  if (obj.keep_alive_period !== undefined && obj.keep_alive_period !== null) {
    // Minutes, command 0x02
    bytes.push(0x02, Math.round(obj.keep_alive_period) & 0xFF);
  }
  if (obj.operational_mode !== undefined && obj.operational_mode !== null) {
    // Command 0x0D
    bytes.push(0x0D, obj.operational_mode & 0xFF);
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
