// Source: Decentlab DL-GS3 datasheet (METER GS3 soil moisture, temperature and electrical
// conductivity sensor for LoRaWAN, discontinued).
// Payload format: protocol_version(1B=2) + device_id(2B) + flags(2B) + sensor blocks. Big endian.
// Sensor block: dielectric permittivity raw (u16, /100) / soil temperature raw (u16, (x-32768)/10) /
// electrical conductivity raw (u16, uS/cm passthrough); battery voltage is its own block.
// Volumetric water content derived from dielectric permittivity (mineral soil, METER GS3):
//   VWC = 5.89e-6*dp^3 - 7.62e-4*dp^2 + 0.0367*dp - 0.0753
var SENSOR_BLOCKS = [
  [
    { key: "dielectric_permittivity", convert: function (x) { return x / 100; } },
    { key: "soil_temperature", convert: function (x) { return (x - 32768) / 10; } },
    { key: "electrical_conductivity", convert: function (x) { return x; } },
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
  if (out.dielectric_permittivity !== undefined) {
    var dp = out.dielectric_permittivity;
    out.volumetric_water_content = 5.89e-6 * dp * dp * dp - 7.62e-4 * dp * dp + 0.0367 * dp - 0.0753;
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
