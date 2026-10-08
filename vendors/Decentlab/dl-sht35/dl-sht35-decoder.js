// Source: Decentlab DL-SHT35 Datasheet - Air Temperature and Humidity Sensor for LoRaWAN
// https://cdn.decentlab.com/download/datasheets/Decentlab-DL-SHT35-datasheet.pdf
// Frame: protocol_version(1B) + device_id(2B) + flags(2B) + sensor blocks.
// Flag bit n set => sensor n block present; each block holds a fixed number of big-endian uint16 values.

var SENSORS = [
  /* sensor 0 */ [
    { key: 'temperature', digits: 2, fn: function (x) { return 175 * x / 65535 - 45; } },
    { key: 'relative_humidity', digits: 2, fn: function (x) { return 100 * x / 65535; } }
  ],
  /* sensor 1 */ [
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
