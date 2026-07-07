function _bwDecode(input) {
  var bytes = input.bytes;

  // Check if the payload is empty by verifying if all elements in 'bytes' are 0 or if 'bytes' is empty
  var isEmptyPayload = bytes.length === 0 || bytes.every(element => element === 0);

  if (isEmptyPayload) {
      return {}; // Return an empty object if the payload is empty
  }

  switch (input.fPort) {
    case 104:
      return {
        data: {
          darker: bytes[0] & 0x01,
          lighter: (bytes[0] >> 1) & 0x01,
          statusChange: (bytes[0] >> 4) & 0x01,
          keepAlive: (bytes[0] >> 5) & 0x01,
          battery: (25 + (bytes[1] & 0x0f)) / 10,
          temperatureBoard: (bytes[2] & 0x7f) - 32,
          lux: (((bytes[5] << 16) | (bytes[4] << 8)) | bytes[3]) / 100
        }
      };
    default:
      return {
        errors: ['unknown FPort'],
      };
  }
}


function _toHex(bytes) {
  return bytes.map(function(b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('').toUpperCase();
}
function _remap(d) { return ({
      lux:               d.lux,
      temperature_board: d.temperatureBoard,
      battery:           d.battery,
      darker:            d.darker,
      lighter:           d.lighter,
    }); }
function decodeUplink(input) {
  var raw = _toHex(input.bytes);
  var result = _bwDecode(input);
  if (!result || !result.data) return { data: { raw_uplink: raw } };
  var out = _remap(result.data);
  out.raw_uplink = raw;
  return { data: out };
}
function Decode(fPort, bytes) { return decodeUplink({ bytes: bytes, fPort: fPort }).data; }
function Decoder(bytes, port) { return decodeUplink({ bytes: bytes, fPort: port }).data; }
