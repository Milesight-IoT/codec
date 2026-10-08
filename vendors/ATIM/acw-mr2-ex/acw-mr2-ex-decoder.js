// Source: ATIM ACW-MR2-EX User Guide EN V1.0, chapter "Sigfox - LoRaWAN frame format"
// https://www.atim.com/wp-content/uploads/documentation/ACW/ACW-MR2-EX/ENGLISH/ATIM_ACW-MR2-EX_UG_EN.pdf
// Cleanroom implementation: frame layout derived solely from the vendor user guide PDF.

function _hex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16)).slice(-2);
  return s.toUpperCase();
}
function _u16(b, o) { return (b[o] << 8) | b[o + 1]; }
function _u32(b, o) { return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0; }

// Reads len bits from the frame starting at absolute bit offset bitOff (MSB-first bit packing).
function _bits(b, bitOff, len) {
  var v = 0;
  for (var k = 0; k < len; k++) {
    var bit = bitOff + k;
    v = (v << 1) | ((b[bit >> 3] >> (7 - (bit & 7))) & 1);
  }
  return v;
}

function _deltas(out, b, bitOff) {
  for (var d = 1; d <= 5; d++) {
    out['meter_1_delta_' + d] = _bits(b, bitOff + (d - 1) * 12, 12);
  }
}

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || !bytes.length) return out;
  out.raw_uplink = _hex(bytes);
  switch (bytes[0]) {
    case 0x01: // keep alive: idle supply voltage + TX supply voltage (mV, MSB first), then 0x64
      if (bytes.length >= 4) { out.supply_idle_mv = _u16(bytes, 1); out.supply_tx_mv = _u16(bytes, 3); }
      break;
    case 0x14: // standard meter reading: wirecut byte + meter index 1 + meter index 2 (32-bit, MSB first)
      if (bytes.length >= 10) {
        out.wirecut = bytes[1] & 1;
        out.meter_1 = _u32(bytes, 2);
        out.meter_2 = _u32(bytes, 6);
      }
      break;
    case 0x37: // broken wire alert frame
      if (bytes.length >= 2) out.wirecut = bytes[1] & 1;
      break;
    case 0x09: // change of state detection frame (dry contacts): byte 1 reserved (0x00), byte 2 = states
      if (bytes.length >= 3) {
        out.digital_input_1 = bytes[2] & 1;
        out.digital_input_2 = (bytes[2] >> 1) & 1;
        out.wirecut = (bytes[2] >> 2) & 1;
      }
      break;
    case 0x30: // LoRaWAN ECO meter mode: six 32-bit indexes, Index 5 (Tref-50min) first, Index 0 (Tref) last
      for (var k = 5, o = 1; k >= 0 && o + 4 <= bytes.length; k--, o += 4) {
        out['meter_1_index_' + k] = _u32(bytes, o);
      }
      break;
    case 0x31: // LoRaWAN test frame: index meter 1
      if (bytes.length >= 5) out.meter_1 = _u32(bytes, 1);
      break;
    case 0x39: // LoRaWAN ECO meter mode: five 12-bit deltas (Tref-10min ... Tref-50min), MSB-first packing
      _deltas(out, bytes, 8);
      break;
    case 0x3a: // meter multi-reading: 20-bit reference index (Tref) + five 12-bit deltas (Tref-30...Tref-150min)
    case 0x3b: // Sigfox meter multi-reading: 20-bit reference index (Tref) + five 12-bit deltas (Tref-60...Tref-300min)
      out.meter_1_ref_index = _bits(bytes, 8, 20);
      _deltas(out, bytes, 28);
      break;
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
