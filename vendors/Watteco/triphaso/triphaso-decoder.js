// Watteco Triphas'O (three-phase energy meter transceiver) uplink decoder.
// Source: https://support.watteco.com/triphaso/ (frame examples, port 125) and cluster pages:
// Energy and Power Metering 0x800A: https://support.watteco.com/energy-power-metering/
// Multiple Energy/Power Metering 0x8010: https://support.watteco.com/multiple-energy-power-metering/
// Voltage and Current Metering 0x800B: https://support.watteco.com/voltage-current-metering/
// Multiple Voltage/Current Metering 0x800D: https://support.watteco.com/multiple-voltage-current-metering/
// Binary Input 0x000F: https://support.watteco.com/cluster-binary-input/
// // Cleanroom implementation: frame layout derived solely from the vendor documentation

// ZCL frame on port 125: <Fctrl><cmd 0x0A><CID><AID><type><len><data>. Fctrl 0x11/0x31/0x51/0x71
// select phase A/B/C/total for cluster 0x800A. 0x800B: 3x U16 (VRMS V/10, IRMS A/10, angle deg).
// 0x800D: 9x I16 (3 phases x VRMS/IRMS/angle). 0x800A: 8x U32 (pos/neg active+reactive energy,
// pos/neg active+reactive power). 0x8010: 8x I32 per attribute (A/B/C/total active+reactive,
// attr 0x0000 energies, 0x0001 powers). 0x000F: present value 0x0055 bool, count 0x0402 U32.
function _hex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16)).slice(-2);
  return s.toUpperCase();
}
function _u8(b, o) { return b[o]; }
function _i8(b, o) { return (b[o] << 24 >> 24); }
function _u16(b, o) { return (b[o] << 8) | b[o + 1]; }
function _i16(b, o) { var v = _u16(b, o); return v >= 0x8000 ? v - 0x10000 : v; }
function _u24(b, o) { return (b[o] << 16) | (b[o + 1] << 8) | b[o + 2]; }
function _i24(b, o) { var v = _u24(b, o); return v >= 0x800000 ? v - 0x1000000 : v; }
function _u32(b, o) { return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0; }
function _i32(b, o) { return (b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]; }
function _f32(b, o) {
  var sign = b[o] & 0x80 ? -1 : 1;
  var exp = ((b[o] & 0x7f) << 1) | (b[o + 1] >> 7);
  var man = ((b[o + 1] & 0x7f) << 16) | (b[o + 2] << 8) | b[o + 3];
  if (exp === 0 && man === 0) return 0.0;
  if (exp === 255) return man ? NaN : sign * Infinity;
  return sign * Math.pow(2, exp - 127) * (1 + man / 0x800000);
}
function _bcd(v) { return ((v >> 4) * 10) + (v & 0x0f); }
function _pad(n) { return n < 10 ? '0' + n : '' + n; }
var PHASES = { 1: 'phase_a', 3: 'phase_b', 5: 'phase_c', 7: 'total' };
function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 8) return out;
  out.raw_uplink = _hex(bytes);
  var fctrl = bytes[0];
  if (bytes[1] !== 0x0A) return out;
  var cid = _u16(bytes, 2);
  var aid = _u16(bytes, 4);
  var type = bytes[6];
  var len = bytes[7];
  var o = 8, end = Math.min(8 + len, bytes.length);
  var ph = PHASES[(fctrl >> 4) & 0x07] || '';
  if (cid === 0x800B && type === 0x41 && len >= 6 && end >= o + 6) {
    // single-phase voltage/current/angle report (manual example section triphaso)
    out[ph + '_voltage'] = _u16(bytes, o) / 10;
    out[ph + '_current'] = _u16(bytes, o + 2) / 10;
    out[ph + '_angle'] = _i16(bytes, o + 4);
  } else if (cid === 0x800D && type === 0x41 && len >= 18 && end >= o + 18) {
    // three-phase voltage/current/angle in one frame
    var names = ['a', 'b', 'c'];
    for (var k = 0; k < 3; k++) {
      out['voltage_phase_' + names[k]] = _u16(bytes, o + k * 6) / 10;
      out['current_phase_' + names[k]] = _u16(bytes, o + k * 6 + 2) / 10;
      out['angle_phase_' + names[k]] = _i16(bytes, o + k * 6 + 4);
    }
  } else if (cid === 0x800A && type === 0x41 && len >= 32 && end >= o + 32) {
    // 8x U32: pos/neg active + reactive energy, pos/neg active + reactive power
    var suf = ['active_energy_positive', 'active_energy_negative', 'reactive_energy_positive',
      'reactive_energy_negative', 'active_power_positive', 'active_power_negative',
      'reactive_power_positive', 'reactive_power_negative'];
    for (var i = 0; i < 8; i++) out[ph + '_' + suf[i]] = _u32(bytes, o + i * 4);
  } else if (cid === 0x8010 && type === 0x41 && len >= 24 && end >= o + 24) {
    // 8x I32 grouped per phase then total; attr 0x0000 energies, 0x0001 powers
    var grp = ['phase_a', 'phase_b', 'phase_c', 'total'];
    var suffix = aid === 0x0001 ? ['active_power_positive', 'reactive_power_positive'] :
      ['active_energy_positive', 'reactive_energy_positive'];
    for (var g = 0; g < 4; g++) {
      out[grp[g] + '_' + suffix[0]] = _i32(bytes, o + g * 8);
      out[grp[g] + '_' + suffix[1]] = _i32(bytes, o + g * 8 + 4);
    }
  } else if (cid === 0x000F) {
    if (aid === 0x0055 && type === 0x10 && bytes.length >= 8) out.input_state = bytes[7] === 1;
    else if (aid === 0x0402 && type === 0x23 && bytes.length >= 11) out.input_pulse_count = _u32(bytes, 7);
 }
  return out;
}
function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
