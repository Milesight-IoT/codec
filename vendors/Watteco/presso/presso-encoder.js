function _hexToBytes(hex) {
  hex = String(hex).replace(/[^0-9a-fA-F]/g, '');
  if (hex.length % 2) hex = '0' + hex;
  var out = [];
  for (var i = 0; i < hex.length; i += 2) out.push(parseInt(hex.substr(i, 2), 16));
  return out;
}

function _encodeRaw(obj) {
  var raw = obj && (obj.raw_downlink !== undefined ? obj.raw_downlink : obj);
  if (typeof raw !== 'string' || !raw) return {
    bytes: [],
    fPort: 125
  };
  var parts = raw.split(':');
  var hex = parts[0];
  var port = parts[1] ? parseInt(parts[1], 10) : 125;
  return {
    bytes: _hexToBytes(hex),
    fPort: port
  };
}

function Encode(fPort, obj) {
  return _encodeRaw(obj).bytes;
}

function Encoder(obj, port) {
  return _encodeRaw(obj).bytes;
}

function encodeDownlink(input) {
  return _encodeRaw(input && input.data);
}
if (typeof module !== 'undefined') {
  module.exports = {
    Encode: Encode,
    Encoder: Encoder,
    encodeDownlink: encodeDownlink
  };
}
