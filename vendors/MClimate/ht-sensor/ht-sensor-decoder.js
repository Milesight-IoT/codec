// Source: MClimate HT Sensor LoRaWAN - official documentation
// https://docs.mclimate.eu/mclimate-lorawan-devices/devices/mclimate-ht-sensor-lorawan/ht-sensor-lorawan-device-communication-protocol
// Clean-room implementation from published payload format tables only.

function _round(value, digits) {
  var f = Math.pow(10, digits);
  return Math.round(value * f) / f;
}

function _u16(hi, lo) {
  return (hi << 8) | lo;
}

var _REGIONS = ['EU868', 'AS923', 'AU915', 'US915'];

function _decodeKeepalive(bytes, i, out) {
  out.temperature = _round((_u16(bytes[i + 1], bytes[i + 2]) - 400) / 10, 1);
  out.humidity = _round(bytes[i + 3] * 100 / 256, 2);
  out.battery_voltage = _round((bytes[i + 4] * 8 + 1600) / 1000, 3);
  out.thermistor_error = ((bytes[i + 5] >> 2) & 0x01) === 1;
  var ext = ((bytes[i + 5] & 0x03) << 8) | bytes[i + 6];
  out.external_temperature = _round(ext / 10, 1);
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
    } else if (cmd === 0x32 && i + 3 <= bytes.length) {
      var tcomp = bytes[i + 2] / 10;
      out.temperature_compensation = _round(bytes[i + 1] === 0x01 ? -tcomp : tcomp, 1);
      i += 3;
    } else if (cmd === 0x34 && i + 3 <= bytes.length) {
      var hcomp = bytes[i + 2];
      out.humidity_compensation = bytes[i + 1] === 0x01 ? -hcomp : hcomp;
      i += 3;
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
