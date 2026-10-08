// Source: Decentlab DL-CTD10B datasheet
// Payload format: protocol_version(1B=2) + device_id(2B) + flags(2B) + sensor blocks.
// flags bit n set -> sensor n block present; block contents per sensor table below. Big endian.
var SENSOR_BLOCKS = [
  [
    { key: "water_depth", convert: function (x) { return x - 32768; } },
    { key: "temperature", convert: function (x) { return (x - 32768) / 10; } },
    { key: "electrical_conductivity", convert: function (x) { return x * 2; } },
    { key: "freezing_flag", convert: function (x) { return x; } },
  ],
  [
    { key: "battery_voltage", convert: function (x) { return x / 1000; } },
  ],
];

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 5) return out;
  var hex = [];
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i].toString(16).toUpperCase();
    hex.push(b.length < 2 ? '0' + b : b);
  }
  out.raw_uplink = hex.join('');
  out.protocol_version = bytes[0];
  out.device_id = (bytes[1] << 8) | bytes[2];
  var flags = (bytes[3] << 8) | bytes[4];
  var offset = 5;
  for (var s = 0; s < SENSOR_BLOCKS.length; s++) {
    if ((flags & (1 << s)) === 0) continue;
    var values = [];
    for (var v = 0; v < SENSOR_BLOCKS[s].length && offset + 2 <= bytes.length; v++) {
      values.push((bytes[offset] << 8) | bytes[offset + 1]);
      offset += 2;
    }
    for (var k = 0; k < values.length; k++) {
      out[SENSOR_BLOCKS[s][k].key] = SENSOR_BLOCKS[s][k].convert(values[k]);
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
