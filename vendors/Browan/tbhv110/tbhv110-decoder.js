function _bwDecode(input) {
  var bytes = input.bytes;

  // Check if the payload is empty by verifying if all elements in 'bytes' are 0 or if 'bytes' is empty
  var isEmptyPayload = bytes.length === 0 || bytes.every(element => element === 0);
  if (isEmptyPayload) {
      return {}; // Return an empty object if the payload is empty
  }

  switch (input.fPort) {
    case 103:
      return {
        data: {
          status: bytes[0] & 0x01,
          tempHumidChanged: (bytes[0] >> 4) & 0x01,
          iaqChanged: (bytes[0] >> 5) & 0x01,
          battery: (25 + (bytes[1] & 0x0f)) / 10,
          temperatureBoard: (bytes[2] & 0x7f) - 32,
          humidity: bytes[3] & 0x7f,
          eco2: (bytes[5] << 8) | bytes[4],
          voc: (bytes[7] << 8) | bytes[6],
          iaq: (bytes[9] << 8) | bytes[8],
          temperature: (bytes[10] & 0x7f) - 32,
        },
      };
    default:
      return {
        errors: ["unknown FPort"],
      };
  }
}




function _toHex(bytes) {
  return bytes.map(function(b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('').toUpperCase();
}
function _remap(d) { return ({
      temperature:       d.temperature,
      temperature_board: d.temperatureBoard,
      humidity:          d.humidity,
      eco2:              d.eco2,
      voc:               d.voc,
      iaq:               d.iaq,
      battery:           d.battery,
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
