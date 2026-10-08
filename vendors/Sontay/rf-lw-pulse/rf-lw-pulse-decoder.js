// Source: Sontay RF-LW-PULSE LoRaWAN 3-Channel Pulse Counter (OEM of Synetica enLink Status-P, firmware FW-STS-P)
// Sontay datasheet / user guide: https://www.sontay.com/en-gb/products/smart-devices/lorawan/rf-lw-pulse-lorawan-pulse-counter/
// Synetica enLink uplink payload spec (TLV, fPort 1): 0x0E pulse channel ID (0-2) + U32 count,
// 0x15 change of state = trigger status byte (bit 0-2 input 1-3 closed-to-open, bit 4-6 input 1-3 open-to-closed)
// + input state byte (bit 0-2, 1 = closed). KPI 0x42 battery voltage U16 mV.
function _hex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16)).slice(-2);
  return s.toUpperCase();
}

function _u16(b, i) {
  return (b[i] << 8) | b[i + 1];
}

function _u32(b, i) {
  return ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
}

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 2) return out;
  var i = 0;
  while (i < bytes.length) {
    var t = bytes[i];
    if (t === 0x0E && i + 6 <= bytes.length) {
      var ch = bytes[i + 1];
      if (ch <= 2) out['pulse_' + (ch + 1) + '_count'] = _u32(bytes, i + 2);
      i += 6;
    } else if (t === 0x15 && i + 3 <= bytes.length) {
      out.trigger_status = bytes[i + 1];
      out.input_1_state = (bytes[i + 2] & 0x01) ? 1 : 0;
      out.input_2_state = (bytes[i + 2] & 0x02) ? 1 : 0;
      out.input_3_state = (bytes[i + 2] & 0x04) ? 1 : 0;
      i += 3;
    } else if (t === 0x42 && i + 3 <= bytes.length) {
      out.battery_voltage = _u16(bytes, i + 1);
      i += 3;
    } else if (t === 0x41 && i + 2 <= bytes.length) {
      // KPI: battery status U8 (0 = ext power, 1-254 = 1.8-3.3V range, 255 = error)
      out.battery_status = bytes[i + 1];
      i += 2;
    } else if (t === 0x4D && i + 5 <= bytes.length) {
      // KPI: air intake fan runtime U32 seconds
      out.fan_runtime = _u32(bytes, i + 1);
      i += 5;
    } else {
      break;
    }
  }
  out.raw_uplink = _hex(bytes);
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
