// Source: MClimate CO2 Sensor and Notifier LoRaWAN - official documentation
// https://docs.mclimate.eu/mclimate-lorawan-devices/devices/mclimate-co2-sensor-and-notifier-lorawan/co2-sensor-lorawan-device-communication-protocol
// Clean-room implementation from published payload format tables only.

function _round(value, digits) {
  var f = Math.pow(10, digits);
  return Math.round(value * f) / f;
}

function _u16(hi, lo) {
  return (hi << 8) | lo;
}

var _LED_STATES = ['None', 'Constant', 'Blink Fast', 'Blink Slow'];
var _REGIONS = ['EU868', 'AS923', 'AU915', 'US915'];

function _decodeKeepalive(bytes, i, out) {
  out.co2 = _u16(bytes[i + 1], bytes[i + 2]);
  out.temperature = _round((_u16(bytes[i + 3], bytes[i + 4]) - 400) / 10, 1);
  out.humidity = _round(bytes[i + 5] * 100 / 256, 2);
  out.battery_voltage = _round((bytes[i + 6] * 8 + 1600) / 1000, 3);
}

function _decodeBuzzer(bytes, i, out, suffix) {
  out['buzzer_beep_duration_' + suffix] = bytes[i + 1];
  out['buzzer_loud_duration_' + suffix] = bytes[i + 2] * 10;
  out['buzzer_silent_duration_' + suffix] = bytes[i + 3] * 10;
}

function _decodeLed(bytes, i, out, suffix) {
  out['led_red_' + suffix] = _LED_STATES[bytes[i + 1]] !== undefined ? _LED_STATES[bytes[i + 1]] : bytes[i + 1];
  out['led_green_' + suffix] = _LED_STATES[bytes[i + 2]] !== undefined ? _LED_STATES[bytes[i + 2]] : bytes[i + 2];
  out['led_blue_' + suffix] = _LED_STATES[bytes[i + 3]] !== undefined ? _LED_STATES[bytes[i + 3]] : bytes[i + 3];
  out['led_duration_' + suffix] = _u16(bytes[i + 4], bytes[i + 5]) * 10;
}

function _decode(bytes) {
  var out = {};
  if (!bytes || !bytes.length) return out;
  var i = 0;
  while (i < bytes.length) {
    var cmd = bytes[i];
    if (cmd === 0x01 && i + 7 <= bytes.length) {
      _decodeKeepalive(bytes, i, out);
      i += 7;
    } else if (cmd === 0x04 && i + 3 <= bytes.length) {
      out.hardware_version = (bytes[i + 1] >> 4) + '.' + (bytes[i + 1] & 0x0F);
      out.software_version = (bytes[i + 2] >> 4) + '.' + (bytes[i + 2] & 0x0F);
      i += 3;
    } else if (cmd === 0x12 && i + 2 <= bytes.length) {
      out.keepalive_period = bytes[i + 1];
      i += 2;
    } else if (cmd === 0x19 && i + 2 <= bytes.length) {
      out.join_retry_period = bytes[i + 1] * 5;
      i += 2;
    } else if (cmd === 0x1B && i + 2 <= bytes.length) {
      out.uplink_confirmed = bytes[i + 1] === 1;
      i += 2;
    } else if (cmd === 0x1D && i + 3 <= bytes.length) {
      out.watchdog_confirmed_uplinks = bytes[i + 1];
      out.watchdog_unconfirmed_hours = bytes[i + 2];
      i += 3;
    } else if (cmd === 0x1F && i + 5 <= bytes.length) {
      out.co2_boundary_good_medium = _u16(bytes[i + 1], bytes[i + 2]);
      out.co2_boundary_medium_bad = _u16(bytes[i + 3], bytes[i + 4]);
      i += 5;
    } else if (cmd === 0x21 && i + 3 <= bytes.length) {
      out.co2_auto_zero_value = _u16(bytes[i + 1], bytes[i + 2]);
      i += 3;
    } else if (cmd === 0x23 && i + 4 <= bytes.length) {
      out.notify_period_good = bytes[i + 1];
      out.notify_period_medium = bytes[i + 2];
      out.notify_period_bad = bytes[i + 3];
      i += 4;
    } else if (cmd === 0x25 && i + 4 <= bytes.length) {
      out.measurement_period_good = bytes[i + 1];
      out.measurement_period_medium = bytes[i + 2];
      out.measurement_period_bad = bytes[i + 3];
      i += 4;
    } else if (cmd === 0x27 && i + 10 <= bytes.length) {
      _decodeBuzzer(bytes, i, out, 'good');
      _decodeBuzzer(bytes, i + 3, out, 'medium');
      _decodeBuzzer(bytes, i + 6, out, 'bad');
      i += 10;
    } else if (cmd === 0x29 && i + 16 <= bytes.length) {
      _decodeLed(bytes, i, out, 'good');
      _decodeLed(bytes, i + 5, out, 'medium');
      _decodeLed(bytes, i + 10, out, 'bad');
      i += 16;
    } else if (cmd === 0x2B && i + 2 <= bytes.length) {
      out.co2_auto_zero_period = bytes[i + 1];
      i += 2;
    } else if (cmd === 0xA4 && i + 2 <= bytes.length) {
      var region = bytes[i + 1];
      out.lorawan_region = _REGIONS[region] !== undefined ? _REGIONS[region] : region;
      i += 2;
    } else {
      break;
    }
  }
  return out;
}

function _toHex(bytes) {
  var hex = '';
  for (var i = 0; i < bytes.length; i++) hex += ('0' + bytes[i].toString(16)).slice(-2);
  return hex.toUpperCase();
}

function _wrap(bytes) {
  var out = _decode(bytes);
  out.raw_uplink = _toHex(bytes);
  return out;
}

function decodeUplink(input) { return { data: _wrap(input && input.bytes) }; }
function Decode(fPort, bytes) { return _wrap(bytes); }
function Decoder(bytes, port) { return _wrap(bytes); }
