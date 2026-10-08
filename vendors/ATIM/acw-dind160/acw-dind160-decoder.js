// Source: ATIM ACW DINDxxx User Guide EN V1.10, chapter "Uplinks on IoT network(s) (Sigfox/LoRaWAN)"
// https://www.atim.com/wp-content/uploads/documentation/ACW/ACW-DIND%20(80,44,160,88)/ENGLISH/ATIM_ACW-DINDxxx_UG_EN.pdf
// Cleanroom implementation: frame layout derived solely from the vendor user guide PDF.

function _hex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16)).slice(-2);
  return s.toUpperCase();
}
function _u16(b, o) { return (b[o] << 8) | b[o + 1]; }
function _i16(b, o) { var v = _u16(b, o); return v >= 0x8000 ? v - 0x10000 : v; }
function _u32(b, o) { return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0; }

// Digital input bitmap (frames 0x4x): byte1 = inputs 1-8, byte2 = inputs 9-16, bit0 = channel 1.
function _inputs(out, b) {
  for (var n = 1; n <= 16; n++) {
    var bit = n <= 8 ? (b[1] >> (n - 1)) : (b[2] >> (n - 9));
    out['digital_input_' + n] = bit & 1;
  }
}

// Meters are 32-bit unsigned, MSB first (Big Endian).
function _meters(out, b, o, first) {
  var n = first;
  for (; o + 4 <= b.length; o += 4) out['meter_' + n++] = _u32(b, o);
}

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || !bytes.length) return out;
  out.raw_uplink = _hex(bytes);
  switch (bytes[0]) {
    case 0x01: // keep alive: supply voltage in mV (INT16, MSB first), then 0x64
      if (bytes.length >= 3) out.power_voltage = _u16(bytes, 1);
      break;
    case 0x05: // test frame with counter
      if (bytes.length >= 2) out.test_counter = bytes[1];
      break;
    case 0x43: // shock alarm frame with counter
      if (bytes.length >= 2) out.shock_counter = bytes[1];
      break;
    case 0x42: // digital inputs state
      if (bytes.length >= 3) _inputs(out, bytes);
      break;
    case 0x41: // digital inputs state + temperature
      if (bytes.length >= 5) { _inputs(out, bytes); out.temperature = _i16(bytes, 3) / 10; }
      break;
    case 0x4e: // inputs + temperature + meter 1
      if (bytes.length >= 9) { _inputs(out, bytes); out.temperature = _i16(bytes, 3) / 10; out.meter_1 = _u32(bytes, 5); }
      break;
    case 0x4f: // inputs + meter 1 + meter 2
      if (bytes.length >= 11) { _inputs(out, bytes); out.meter_1 = _u32(bytes, 3); out.meter_2 = _u32(bytes, 7); }
      break;
    case 0x52: // inputs + meter 1
      if (bytes.length >= 7) { _inputs(out, bytes); out.meter_1 = _u32(bytes, 3); }
      break;
    case 0x50: // meters 1 & 2
      if (bytes.length >= 9) { out.meter_1 = _u32(bytes, 1); out.meter_2 = _u32(bytes, 5); }
      break;
    case 0x51: // meters 3 & 4
      if (bytes.length >= 9) { out.meter_3 = _u32(bytes, 1); out.meter_4 = _u32(bytes, 5); }
      break;
    case 0x5f: // meters 5 & 6
      if (bytes.length >= 9) { out.meter_5 = _u32(bytes, 1); out.meter_6 = _u32(bytes, 5); }
      break;
    case 0x60: // meters 7 & 8
      if (bytes.length >= 9) { out.meter_7 = _u32(bytes, 1); out.meter_8 = _u32(bytes, 5); }
      break;
    case 0x5d: // inputs + temperature + meters 1 to n
      if (bytes.length >= 7) { _inputs(out, bytes); out.temperature = _i16(bytes, 3) / 10; _meters(out, bytes, 5, 1); }
      break;
    case 0x5e: // inputs + meters 1 to n
      if (bytes.length >= 5) { _inputs(out, bytes); _meters(out, bytes, 3, 1); }
      break;
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
