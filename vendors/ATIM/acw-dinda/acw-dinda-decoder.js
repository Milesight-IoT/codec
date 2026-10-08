// Source: ATIM ACW-DINDA User Guide EN V1.6, chapter "Frames formatting"
// https://www.atim.com/wp-content/uploads/documentation/ACW/ACW-DINDA/ENGLISH/ATIM_ACW-DINDA_UG_EN.pdf
// Cleanroom implementation: frame layout derived solely from the vendor user guide PDF.

function _hex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16)).slice(-2);
  return s.toUpperCase();
}
function _u16(b, o) { return (b[o] << 8) | b[o + 1]; }
function _ascii(b, o, len) {
  var s = '';
  for (var i = 0; i < len; i++) s += String.fromCharCode(b[o + i]);
  return s.replace(/\s+$/, '');
}

function _digitalInputs(out, b) {
  out.digital_input_1 = b & 1;
  out.digital_input_2 = (b >> 1) & 1;
}

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || !bytes.length) return out;
  out.raw_uplink = _hex(bytes);
  switch (bytes[0]) {
    case 0x01: // keep alive: idle supply voltage + TX supply voltage (mV, INT16, MSB first), then 0x64
      if (bytes.length >= 4) { out.supply_idle_mv = _u16(bytes, 1); out.supply_tx_mv = _u16(bytes, 3); }
      break;
    case 0x05: // test frame with counter
      if (bytes.length >= 2) out.test_counter = bytes[1];
      break;
    case 0x18: // periodic voltage reading (0-10V): inputs state, value, min, max, 4-char unit
    case 0x19: // periodic current reading (0-20mA): same layout
      if (bytes.length >= 12) {
        _digitalInputs(out, bytes[1]);
        out.analog_value = _u16(bytes, 2);
        out.analog_min = _u16(bytes, 4);
        out.analog_max = _u16(bytes, 6);
        out.analog_unit = _ascii(bytes, 8, 4);
      }
      break;
    case 0x1e: // low threshold alert, 0-10V
    case 0x1f: // end of low threshold alert, 0-10V
    case 0x20: // high threshold alert, 0-10V
    case 0x21: // end of high threshold alert, 0-10V
    case 0x22: // low threshold alert, 0-20mA
    case 0x23: // end of low threshold alert, 0-20mA
    case 0x24: // high threshold alert, 0-20mA
    case 0x25: // end of high threshold alert, 0-20mA
      if (bytes.length >= 6) {
        _digitalInputs(out, bytes[1]);
        out.alert_type = {
          0x1e: 'voltage_low', 0x1f: 'voltage_low_end',
          0x20: 'voltage_high', 0x21: 'voltage_high_end',
          0x22: 'current_low', 0x23: 'current_low_end',
          0x24: 'current_high', 0x25: 'current_high_end'
        }[bytes[0]];
        out.analog_value = _u16(bytes, 2);
        out.analog_min = _u16(bytes, 4);
      }
      break;
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
