function _bwDecode(input) {
    var bytes = input.bytes;

     // Check if the payload is empty by verifying if all elements in 'bytes' are 0 or if 'bytes' is empty
  var isEmptyPayload = bytes.length === 0 || bytes.every(element => element === 0);
  if (isEmptyPayload) {
      return {}; // Return an empty object if the payload is empty
  }

    switch (input.fPort) {
      case 105:
        return {
          data: {
            status: bytes[0] & 0x01,
            battery: (25 + (bytes[1] & 0x0f)) / 10,
            temperatureBoard: (bytes[2] & 0x7f) - 32,
            decibel: bytes[3]
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
      decibel:           d.decibel,
      temperature_board: d.temperatureBoard,
      battery:           d.battery,
      status:            d.status,
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
