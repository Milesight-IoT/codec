// Source: Decentlab DL-DLR2 datasheet (DLR2-012 = strain gauge configuration, discontinued).
// DLR2 frame contents depend on the sensor configuration (datasheet DETAILS defers to config).
// DLR2-012: sensor 0 block = one strain gauge reading as 32-bit ratiometric value
// (low word + high word*65536 over 8388608 = 2^23, offset binary);
// strain [um/m] = ((raw/8388608 - 1) / 64) * 4 / 2.02 * 1e6
// (quarter-bridge scaling with gauge factor 2.02);
// battery voltage is its own block (Decentlab platform convention).
// Payload format: protocol_version(1B=2) + device_id(2B) + flags(2B) + sensor blocks. Big endian.
var SENSOR_BLOCKS = [
  [
    { key: "strain_gauge", words: 2, convert: function (lo, hi) { return ((lo + hi * 65536) / 8388608 - 1) / 64 * 4 / 2.02 * 1000000; } },
  ],
  [
    { key: "battery_voltage", words: 1, convert: function (x) { return x / 1000; } },
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
    for (var k = 0; k < SENSOR_BLOCKS[s].length && offset + SENSOR_BLOCKS[s][k].words * 2 <= bytes.length; k++) {
      var def = SENSOR_BLOCKS[s][k];
      var raws = [];
      for (var r = 0; r < def.words; r++) {
        raws.push((bytes[offset] << 8) | bytes[offset + 1]);
        offset += 2;
      }
      out[def.key] = def.convert.apply(null, raws);
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
