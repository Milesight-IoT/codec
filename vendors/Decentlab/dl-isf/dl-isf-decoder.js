// Source: Decentlab DL-ISF (sap flow sensor, heat-ratio / thermal
// dissipation method, for LoRaWAN) payload format specification —
// discontinued/custom model, functional spec extracted from the vendor's
// official format documentation (2026-10),
// manuals/Decentlab/dl-blocked21-specification.md, "dl-isf" section.
// Cleanroom implementation: frame layout and conversions derived solely
// from that functional specification.
//
// Frame: version(1B, =2) + device_id(2B) + flags(2B), big endian, then one
// uint16 block per flag bit set (bit n == 1 -> sensor n data included).
// Sensor 0 (16 x u16, x[0]..x[15]):
//   sap flow            = (x[0]  * 16 - 50000)   / 1000    [l/h]
//   heat velocity outer = (x[1]  * 16 - 50000)   / 1000    [cm/h]
//   heat velocity inner = (x[2]  * 16 - 50000)   / 1000    [cm/h]
//   alpha outer         = (x[3]  * 32 - 1000000) / 100000
//   alpha inner         = (x[4]  * 32 - 1000000) / 100000
//   beta outer          = (x[5]  * 32 - 1000000) / 100000
//   beta inner          = (x[6]  * 32 - 1000000) / 100000
//   tmax outer          = (x[7]  * 2) / 1000               [s]
//   tmax inner          = (x[8]  * 2) / 1000               [s]
//   temperature outer   = (x[9]  - 32768) / 100            [degC]
//   max voltage         = (x[10] - 32768) / 1000           [V]
//   min voltage         = (x[11] - 32768) / 1000           [V]
//   diagnostic          = x[12] + x[13] * 65536
//   upstream tmax outer = (x[14] * 2) / 1000               [s]
//   upstream tmax inner = (x[15] * 2) / 1000               [s]
// Sensor 1: battery voltage = x / 1000 [V]

function _hex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16)).slice(-2);
  return s.toUpperCase();
}

function _u16(b, o) { return (b[o] << 8) | b[o + 1]; }

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 5) return out;
  out.raw_uplink = _hex(bytes);
  out.protocol_version = bytes[0];
  out.device_id = _u16(bytes, 1);
  var flags = _u16(bytes, 3);
  var o = 5;
  if ((flags & 1) && o + 32 <= bytes.length) {
    var x = [];
    for (var i = 0; i < 16; i++) x.push(_u16(bytes, o + 2 * i));
    out.sap_flow = (x[0] * 16 - 50000) / 1000;
    out.heat_velocity_outer = (x[1] * 16 - 50000) / 1000;
    out.heat_velocity_inner = (x[2] * 16 - 50000) / 1000;
    out.alpha_outer = (x[3] * 32 - 1000000) / 100000;
    out.alpha_inner = (x[4] * 32 - 1000000) / 100000;
    out.beta_outer = (x[5] * 32 - 1000000) / 100000;
    out.beta_inner = (x[6] * 32 - 1000000) / 100000;
    out.tmax_outer = (x[7] * 2) / 1000;
    out.tmax_inner = (x[8] * 2) / 1000;
    out.temperature_outer = (x[9] - 32768) / 100;
    out.max_voltage = (x[10] - 32768) / 1000;
    out.min_voltage = (x[11] - 32768) / 1000;
    out.diagnostic = x[12] + x[13] * 65536;
    out.upstream_tmax_outer = (x[14] * 2) / 1000;
    out.upstream_tmax_inner = (x[15] * 2) / 1000;
    o += 32;
  }
  if ((flags & 2) && o + 2 <= bytes.length) {
    out.battery_voltage = _u16(bytes, o) / 1000;
    o += 2;
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
