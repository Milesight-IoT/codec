// Source: NKE Watteco official support documentation
// https://support.watteco.com/kittoranoliquidlevel/ (Kit Lev'O+ Liquid Level - Applicative layer)
// The kit pairs a 0-0.3 bar (4-20mA) pressure probe with a Toran'O transmitter (frames on port 125,
// ZCL-like structure: Fctrl, CmdID, ClusterID, AttributeID, AttributeType, Data).
// Formulas from the documentation:
//   Delta_Pressure [Pa] = (0.01875 * I_mA - 0.075) * 100000
//   Fluid_Level [m] = Delta_Pressure / (9.81 * Fluid_Density), water density 997 kg/m3
// Worked example: 10 mA -> 11250 Pa -> 1.15 m of water.
// Battery via Configuration cluster (0x0050 attr 0x0006). Batch frames (Fctrl bit0=0) are not decoded here.

function _hex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
  return s.toUpperCase();
}

function _endpoint(fctrl) {
  // bit7=EP_bit2, bit6=EP_bit1, bit5=EP_bit0(LSB), bit2=EP_bit4(MSB), bit1=EP_bit3 (per generic format)
  return (((fctrl >> 7) & 1) << 2) | (((fctrl >> 6) & 1) << 1) | ((fctrl >> 5) & 1) |
    (((fctrl >> 2) & 1) << 4) | (((fctrl >> 1) & 1) << 3);
}

function _uint(bytes, pos, len) {
  var v = 0;
  for (var i = 0; i < len && pos + i < bytes.length; i++) v = v * 256 + bytes[pos + i];
  return v;
}

function _int(bytes, pos, len) {
  var v = _uint(bytes, pos, len);
  var sign = Math.pow(2, len * 8 - 1);
  return v >= sign ? v - sign * 2 : v;
}

function _float32(bytes, pos) {
  if (pos + 4 > bytes.length) return 0;
  var sign = (bytes[pos] & 0x80) ? -1 : 1;
  var exp = ((bytes[pos] & 0x7f) << 1) | (bytes[pos + 1] >> 7);
  var frac = ((bytes[pos + 1] & 0x7f) * 65536 + bytes[pos + 2] * 256 + bytes[pos + 3]) / 8388608;
  if (exp === 0 || exp === 255) return 0;
  return sign * (1 + frac) * Math.pow(2, exp - 127);
}

function _value(bytes, pos, type) {
  switch (type) {
    case 0x10: return { v: bytes[pos] ? 1 : 0, size: 1 };
    case 0x18: return { v: bytes[pos], size: 1 };
    case 0x19: return { v: _uint(bytes, pos, 2), size: 2 };
    case 0x20: return { v: bytes[pos], size: 1 };
    case 0x21: return { v: _uint(bytes, pos, 2), size: 2 };
    case 0x23: return { v: _uint(bytes, pos, 4), size: 4 };
    case 0x28: return { v: _int(bytes, pos, 1), size: 1 };
    case 0x29: return { v: _int(bytes, pos, 2), size: 2 };
    case 0x2b: return { v: _int(bytes, pos, 4), size: 4 };
    case 0x30: return { v: bytes[pos], size: 1 };
    case 0x31: return { v: _uint(bytes, pos, 2), size: 2 };
    case 0x39: return { v: _float32(bytes, pos), size: 4 };
    default: return null;
  }
}

function _batteryVolts(bytes, pos) {
  // Cluster Configuration (0x0050) attr NodePowerDescriptor (0x0006), octet string (type 0x41):
  // [size][power mode][power sources bitmap][U16 level in mV per source][current source]
  if (pos >= bytes.length) return null;
  var size = bytes[pos];
  var end = Math.min(pos + 1 + size, bytes.length);
  var p = pos + 1;
  if (p + 2 > end) return null;
  var sources = bytes[p + 1];
  var count = 0, mask = sources;
  while (mask) { count += mask & 1; mask >>= 1; }
  var volts = [];
  for (var i = 0; i < count && p + 4 + 2 * i <= end; i++) volts.push(_uint(bytes, p + 2 + 2 * i, 2));
  if (!volts.length) return null;
  var current = p + 2 + 2 * count < end ? bytes[p + 2 + 2 * count] : 0;
  var idx = -1;
  if (current > 0 && (current & (current - 1)) === 0) {
    var b = 0, m = current;
    while (m > 1) { m >>= 1; b++; }
    if (b < volts.length) idx = b;
  }
  if (idx < 0 && (sources & 0x04)) { // bit2 = disposable battery
    var below = 0;
    for (var k = 0; k < 2; k++) if (sources & (1 << k)) below++;
    if (below < volts.length) idx = below;
  }
  if (idx < 0) idx = 0;
  return volts[idx] / 1000;
}

function _round(x, d) {
  var f = Math.pow(10, d);
  return Math.round(x * f) / f;
}

var WATER_DENSITY = 997; // kg/m3, per documentation worked example

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || !bytes.length) return out;
  out.raw_uplink = _hex(bytes);
  if (bytes.length < 8) return out;
  var fctrl = bytes[0];
  if (!(fctrl & 0x01)) return out; // batch report frame
  var cmd = bytes[1];
  if (cmd !== 0x0a && cmd !== 0x8a && cmd !== 0x01) return out;
  var cid = _uint(bytes, 2, 2);
  var p = 4;
  if (cmd === 0x01) {
    if (bytes[4] !== 0) return out; // read response status != success
    p = 5;
  }
  var aid = _uint(bytes, p, 2);
  var type = bytes[p + 2];
  p += 3;

  if (cid === 0x0050 && aid === 0x0006) {
    if (type === 0x41) {
      var v = _batteryVolts(bytes, p);
      if (v !== null) out.battery_voltage = _round(v, 3);
    }
    return out;
  }

  var parsed = _value(bytes, p, type);
  if (!parsed) return out;
  if (cid === 0x000c && _endpoint(fctrl) === 0 && aid === 0x0055) {
    // 4-20mA input on Toran'O connector A (EndPoint 0)
    out.current_ma = _round(parsed.v, 3);
    out.pressure_pa = _round((0.01875 * parsed.v - 0.075) * 100000, 0);
    out.liquid_level_m = _round(out.pressure_pa / (9.81 * WATER_DENSITY), 2);
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input && input.bytes, input && input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
