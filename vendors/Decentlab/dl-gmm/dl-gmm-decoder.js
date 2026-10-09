// Source: Decentlab DL-GMM datasheet (greenhouse gas monitor for LoRaWAN, discontinued).
// Payload format: protocol_version(1B=2) + device_id(2B) + flags(2B) + sensor blocks. Big endian.
// Sensor block (7 x u16, offset-binary around 32768): photosynthetically active radiation
// ((x-32768)/10, umol/m2/s) / air temperature ((x-32768)/100, degC) / air humidity ((x-32768)/10, %) /
// CO2 concentration ((x-32768)/1, ppm) / atmospheric pressure ((x-32768)/100, kPa) /
// vapor pressure deficit ((x-32768)/100, kPa) / dew point ((x-32768)/100, degC);
// battery voltage is its own block (Decentlab platform convention).
var SENSOR_BLOCKS = [
  [
    { key: "photosynthetically_active_radiation", convert: function (x) { return (x - 32768) / 10; } },
    { key: "air_temperature", convert: function (x) { return (x - 32768) / 100; } },
    { key: "air_humidity", convert: function (x) { return (x - 32768) / 10; } },
    { key: "co2_concentration", convert: function (x) { return (x - 32768) / 1; } },
    { key: "atmospheric_pressure", convert: function (x) { return (x - 32768) / 100; } },
    { key: "vapor_pressure_deficit", convert: function (x) { return (x - 32768) / 100; } },
    { key: "dew_point", convert: function (x) { return (x - 32768) / 100; } },
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
