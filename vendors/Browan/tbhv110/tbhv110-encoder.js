// Source: Browan Healthy Home Sensor (IAQ) Reference Manual TBHV110-915/TBHV110-868
// Appendix Configuration Downlink Command (port 204): 0x00 get / set keep-alive
// (unit 5 min, 1-216), 0x01 temperature delta (0-100 degC), 0x02 RH delta
// (0-100 %), 0x03 IAQ index delta (0-255). Raw passthrough kept as fallback.
function _hexToBytes(hex) {
  hex = String(hex).replace(/[^0-9a-fA-F]/g, '');
  if (hex.length % 2) hex = '0' + hex;
  var out = [];
  for (var i = 0; i < hex.length; i += 2) out.push(parseInt(hex.substr(i, 2), 16));
  return out;
}

function _clamp(value, min, max) {
  if (isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function _encodeStructured(obj) {
  // get_config must be sent alone: a lone 0x00 byte is the Get command,
  // 0x00 followed by a value byte would be parsed as a keep-alive Set.
  if (obj.get_config) return { bytes: [0x00], fPort: 204 };
  var bytes = [];
  if (obj.set_keep_alive_interval !== undefined) {
    var units = _clamp(Math.round(Number(obj.set_keep_alive_interval) / 5), 1, 216);
    bytes.push(0x00, units);
  }
  if (obj.set_temperature_delta !== undefined) {
    bytes.push(0x01, _clamp(Math.round(Number(obj.set_temperature_delta)), 0, 100));
  }
  if (obj.set_humidity_delta !== undefined) {
    bytes.push(0x02, _clamp(Math.round(Number(obj.set_humidity_delta)), 0, 100));
  }
  if (obj.set_iaq_delta !== undefined) {
    bytes.push(0x03, _clamp(Math.round(Number(obj.set_iaq_delta)), 0, 255));
  }
  if (bytes.length) return { bytes: bytes, fPort: 204 };
  return null;
}

function _encodeRaw(obj) {
  var raw = obj && (obj.raw_downlink !== undefined ? obj.raw_downlink : obj);
  if (typeof raw !== 'string' || !raw) return { bytes: [], fPort: 1 };
  var parts = raw.split(':');
  var hex = parts[0];
  var port = parts[1] ? parseInt(parts[1], 10) : 1;
  return { bytes: _hexToBytes(hex), fPort: port };
}

function _encode(obj) {
  if (obj && typeof obj === 'object' && !obj.raw_downlink) {
    var structured = _encodeStructured(obj);
    if (structured) return structured;
  }
  return _encodeRaw(obj);
}

function Encode(fPort, obj) { return _encode(obj).bytes; }
function Encoder(obj, port) { return _encode(obj).bytes; }
function encodeDownlink(input) { return _encode(input && input.data); }
