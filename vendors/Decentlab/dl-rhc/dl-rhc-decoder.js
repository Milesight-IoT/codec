// Source: Decentlab DL-LP8P Datasheet - CO2, Temperature, Humidity and Barometric Pressure Sensor for LoRaWAN
// (DL-RHC is the earlier model name of this product line)
// https://cdn.decentlab.com/download/datasheets/Decentlab-DL-LP8P-datasheet.pdf
// Frame: protocol_version(1B) + device_id(2B) + flags(2B) + sensor blocks.
// Flag bit n set => sensor n block present; each block holds a fixed number of big-endian uint16 values.

var SENSORS = [
  /* sensor 0 */ [
    { key: 'air_temperature', digits: 2, fn: function (x) { return x / 65536 * 175.72 - 46.85; } },
    { key: 'air_humidity', digits: 2, fn: function (x) { return x / 65536 * 125 - 6; } }
  ],
  /* sensor 1 */ [
    { key: 'barometer_temperature', digits: 2, fn: function (x) { return (x - 5000) / 100; } },
    { key: 'barometric_pressure', digits: 0, fn: function (x) { return x * 2; } }
  ],
  /* sensor 2 */ [
    { key: 'co2_concentration', digits: 0, fn: function (x) { return x - 32768; } },
    { key: 'co2_concentration_lpf', digits: 0, fn: function (x) { return x - 32768; } },
    { key: 'co2_sensor_temperature', digits: 2, fn: function (x) { return (x - 32768) / 100; } },
    { key: 'capacitor_voltage_1', digits: 3, fn: function (x) { return x / 1000; } },
    { key: 'capacitor_voltage_2', digits: 3, fn: function (x) { return x / 1000; } },
    { key: 'co2_sensor_status', digits: 0, fn: function (x) { return x; } },
    { key: 'raw_ir_reading', digits: 0, fn: function (x) { return x; } },
    { key: 'raw_ir_reading_lpf', digits: 0, fn: function (x) { return x; } }
  ],
  /* sensor 3 */ [
    { key: 'battery_voltage', digits: 3, fn: function (x) { return x / 1000; } }
  ]
];

var DERIVED = [];

function _r(v, d) {
  var m = Math.pow(10, d);
  return Math.round(v * m) / m;
}

function _hex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) {
    var h = (bytes[i] & 0xff).toString(16).toUpperCase();
    s += h.length < 2 ? '0' + h : h;
  }
  return s;
}

function _decode(bytes) {
  var out = {};
  if (!bytes || bytes.length < 5) return out;
  out.raw_uplink = _hex(bytes);
  out.protocol_version = bytes[0];
  out.device_id = (bytes[1] << 8) | bytes[2];
  var flags = (bytes[3] << 8) | bytes[4];
  var i = 5;
  for (var s = 0; s < SENSORS.length; s++) {
    if ((flags & (1 << s)) === 0) continue;
    var block = SENSORS[s];
    if (!block) return out;
    for (var k = 0; k < block.length; k++) {
      if (i + 2 > bytes.length) return out;
      var raw = (bytes[i] << 8) | bytes[i + 1];
      i += 2;
      out[block[k].key] = _r(block[k].fn(raw), block[k].digits);
    }
  }
  for (var d = 0; d < DERIVED.length; d++) {
    var def = DERIVED[d];
    var from = def.from;
    if (!Array.isArray(from)) from = [from];
    var vals = [];
    var ok = true;
    for (var q = 0; q < from.length; q++) {
      if (out[from[q]] === undefined) { ok = false; break; }
      vals.push(out[from[q]]);
    }
    if (ok) out[def.key] = _r(def.fn.apply(null, vals), def.digits);
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes) }; }
function Decode(fPort, bytes) { return _decode(bytes); }
function Decoder(bytes, port) { return _decode(bytes); }
