// Watteco Smart Plug (metering actuator outlet) uplink decoder.
// Source: https://support.watteco.com/smartplug/ (frame examples, port 125) and cluster pages:
// Simple Metering Like 0x0052: https://support.watteco.com/simple-metering-like-cluster/
// ON/OFF 0x0006: https://support.watteco.com/onoff-cluster/
// Power Quality 0x8052: https://support.watteco.com/power-quality-cluster/
// // Cleanroom implementation: frame layout derived solely from the vendor documentation

// ZCL frame on port 125: <0x11><cmd 0x0A><CID><AID><type><len/data>.
// 0x0052 attr 0x0000 type 0x41 len 0x0C: active energy I24 Wh, reactive energy I24 VARh,
// sample count U16, active power I16 W, reactive power I16 VAR.
// 0x0006 attr 0x0000 type 0x10: relay state (report); relay control is cluster command
// 0x50 (11 50 00 06 00|01|02 = off/on/toggle) sent via raw downlink.
// 0x8052 attr 0x0000 type 0x41 len 0x18: 12x U16 - freq/freq min/freq max in
// (x+22232) Hz/1000, Vrms/Vrms min/Vrms max and Vpeak/Vpeak min/Vpeak max in V/10,
// then overvoltage/sag/brownout counters.
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
function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 7) return out;
  out.raw_uplink = _hex(bytes);
  if (bytes[1] !== 0x0A) return out;
  var cid = _u16(bytes, 2);
  var aid = _u16(bytes, 4);
  var type = bytes[6];
  var o = 7, end = bytes.length;
  if (cid === 0x0052 && aid === 0x0000 && type === 0x41 && bytes.length >= 8 + 12) {
    var len = bytes[7];
    if (len >= 12) {
      o = 8;
      out.active_energy = _i24(bytes, o);
      out.reactive_energy = _i24(bytes, o + 3);
      out.sample_count = _u16(bytes, o + 6);
      out.active_power = _i16(bytes, o + 8);
      out.reactive_power = _i16(bytes, o + 10);
    }
  } else if (cid === 0x0006 && aid === 0x0000 && type === 0x10 && bytes.length >= 8) {
    out.relay_state = bytes[7] === 1;
  } else if (cid === 0x8052 && aid === 0x0000 && type === 0x41 && bytes.length >= 8 + 24) {
    var len2 = bytes[7];
    if (len2 >= 24) {
      o = 8;
      out.mains_frequency = (_u16(bytes, o) + 22232) / 1000;
      out.mains_frequency_min = (_u16(bytes, o + 2) + 22232) / 1000;
      out.mains_frequency_max = (_u16(bytes, o + 4) + 22232) / 1000;
      out.mains_voltage = _u16(bytes, o + 6) / 10;
      out.mains_voltage_min = _u16(bytes, o + 8) / 10;
      out.mains_voltage_max = _u16(bytes, o + 10) / 10;
      out.voltage_peak = _u16(bytes, o + 12) / 10;
      out.voltage_peak_min = _u16(bytes, o + 14) / 10;
      out.voltage_peak_max = _u16(bytes, o + 16) / 10;
      out.overvoltage_count = _u16(bytes, o + 18);
      out.sag_count = _u16(bytes, o + 20);
      out.brownout_count = _u16(bytes, o + 22);
    }
  }
  return out;
}
function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
