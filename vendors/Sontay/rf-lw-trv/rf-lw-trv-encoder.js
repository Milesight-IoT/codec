// Source: Sontay RF-LW-TRV LoRaWAN TRV Smart Radiator Thermostat
// OEM hardware: MClimate Vicki LoRaWAN, downlink commands per
// https://docs.mclimate.eu/mclimate-lorawan-devices/devices/mclimate-vicki-lorawan/pre-46-vicki-lorawan-device-communication-protocol/set-motor-position-and-update-target-temperature-command-explanation.md
// Structured encoding: target_temperature -> 0x51 (0.1 degC resolution),
// valve_openness -> 0x4E (percent). Raw passthrough ("hex:port") is the fallback.

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
  if (obj.target_temperature !== undefined && obj.target_temperature !== null && obj.target_temperature !== '') {
    var t = Math.round(Number(obj.target_temperature) * 10);
    if (isFinite(t) && t >= 0 && t <= 65535) return { bytes: [0x51, (t >> 8) & 0xff, t & 0xff], fPort: 2 };
  }
  if (obj.valve_openness !== undefined && obj.valve_openness !== null && obj.valve_openness !== '') {
    var p = Math.round(Number(obj.valve_openness));
    if (isFinite(p) && p >= 0 && p <= 100) return { bytes: [0x4e, p], fPort: 2 };
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
