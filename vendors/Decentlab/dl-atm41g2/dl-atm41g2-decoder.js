// Source: Decentlab DL-ATM41G2 datasheet
// Payload format: protocol_version(1B=2) + device_id(2B) + flags(2B) + sensor blocks.
// flags bit n set -> sensor n block present; block contents per sensor table below. Big endian.
var SENSOR_BLOCKS = [
  [
    { key: "solar_radiation", convert: function (x) { return (x - 32768) / 10; } },
    { key: "precipitation", convert: function (x) { return x / 1000; } },
    { key: "lightning_strike_count", convert: function (x) { return x - 32768; } },
    { key: "lightning_average_distance", convert: function (x) { return x - 32768; } },
    { key: "wind_speed", convert: function (x) { return (x - 32768) / 100; } },
    { key: "wind_direction", convert: function (x) { return (x - 32768) / 10; } },
    { key: "maximum_wind_speed", convert: function (x) { return (x - 32768) / 100; } },
    { key: "air_temperature", convert: function (x) { return (x - 32768) / 10; } },
    { key: "vapor_pressure", convert: function (x) { return (x - 32768) / 100; } },
    { key: "barometric_pressure", convert: function (x) { return (x - 32768) / 100; } },
    { key: "relative_humidity", convert: function (x) { return (x - 32768) / 10; } },
    { key: "internal_temperature", convert: function (x) { return (x - 32768) / 10; } },
    { key: "tilt_x", convert: function (x) { return (x - 32768) / 10; } },
    { key: "tilt_y", convert: function (x) { return (x - 32768) / 10; } },
    { key: "precipitation_electrical_conductivity", convert: function (x) { return x - 32768; } },
    { key: "cumulative_precipitation_lsb", convert: function (x) { return x / 1000; }, rawKey: "cpr_lsb" },
    { key: "cumulative_precipitation_msb", convert: function (x) { return x / 1000; }, rawKey: "cpr_msb" },
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
  var raws = {};
  for (var s = 0; s < SENSOR_BLOCKS.length; s++) {
    if ((flags & (1 << s)) === 0) continue;
    var values = [];
    for (var v = 0; v < SENSOR_BLOCKS[s].length && offset + 2 <= bytes.length; v++) {
      values.push((bytes[offset] << 8) | bytes[offset + 1]);
      offset += 2;
    }
    for (var k = 0; k < values.length; k++) {
      var def = SENSOR_BLOCKS[s][k];
      out[def.key] = def.convert(values[k]);
      if (def.rawKey) raws[def.rawKey] = values[k];
    }
  }
  // datasheet: total cumulative precipitation T = ALSB + (AMSB × 65536) [mm]
  if (raws.cpr_lsb !== undefined && raws.cpr_msb !== undefined) {
    out.cumulative_precipitation = (raws.cpr_lsb + raws.cpr_msb * 65536) / 1000;
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
