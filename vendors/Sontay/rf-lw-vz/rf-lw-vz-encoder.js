// Source: Sontay RF-LW-VZ LoRaWAN Water Shut-Off Valve
// OEM hardware: MClimate T-Valve LoRaWAN, downlink command per
// https://docs.mclimate.eu/mclimate-lorawan-devices/devices/mclimate-t-valve-lorawan/t-valve-lorawan-communication-protocol/valve-state-control.md
// Structured encoding: valve_state -> 0x0C 00/01 (general valve state control).
// Raw passthrough ("hex:port") is the fallback.

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
  if (!obj || typeof obj !== 'object') return null;
  if (obj.valve_state !== undefined && obj.valve_state !== null && obj.valve_state !== '') {
    var v = Number(obj.valve_state);
    if (isFinite(v) && (v === 0 || v === 1)) return { bytes: [0x0c, v], fPort: 2 };
  }
  return null;
}
function _encode(obj) {
  var s = _encodeStructured(obj);
  if (s) return s;
  return _encodeRaw(obj);
}
function Encode(fPort, obj) { return _encode(obj).bytes; }
function Encoder(obj, port) { return _encode(obj).bytes; }
function encodeDownlink(input) { return _encode(input && input.data); }
