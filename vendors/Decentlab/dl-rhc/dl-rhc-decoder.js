// Source: Decentlab DL-RHC (air temperature and humidity sensor, predecessor of DL-SHT35).
// DL-RHC has no datasheet on the official CDN any more. Frame layout and conversions follow the
// Decentlab platform conventions and are validated against reference sample frames:
//   sensor 0 block (flag bit 0): sensor id (u32, low word first: d0 + d1·65536),
//                                air humidity (u16, x/100 [%]),
//                                air temperature (u16, (x - 32768)/100 [°C])
//   sensor 1 block (flag bit 1): battery voltage (u16, x/1000 [V])
// Payload format: protocol_version(1B=2) + device_id(2B) + flags(2B) + sensor blocks. Big endian.
var SENSOR_BLOCKS = [
  [
    { key: "sensor_id", bytes: 4, convert: function (lo, hi) { return lo + hi * 65536; } },
    { key: "air_humidity", bytes: 2, convert: function (x) { return x / 100; } },
    { key: "air_temperature", bytes: 2, convert: function (x) { return (x - 32768) / 100; } },
  ],
  [
    { key: "battery_voltage", bytes: 2, convert: function (x) { return x / 1000; } },
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
    for (var k = 0; k < SENSOR_BLOCKS[s].length && offset + SENSOR_BLOCKS[s][k].bytes <= bytes.length; k++) {
      var def = SENSOR_BLOCKS[s][k];
      var raws = [];
      for (var r = 0; r < def.bytes / 2; r++) {
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
