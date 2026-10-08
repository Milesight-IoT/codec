// Source: Synetica enLink IAQ payload specification (cleanroom reimplementation).
// Uplink payload: sequence of [type byte][value bytes] elements, big-endian, F32 = IEEE 754.
// Uplink port: 1 by default. enLink IAQ-C sensor element set.

var _ELEMENTS = {
  '01': { id: 'temperature', bytes: 2, fmt: 'S16', scale: 10 },
  '02': { id: 'humidity', bytes: 1, fmt: 'U8' },
  '04': { id: 'pressure', bytes: 2, fmt: 'U16' },
  '05': { id: 'voc_iaq_index', bytes: 2, fmt: 'U16' },
  '08': { id: 'co2', bytes: 2, fmt: 'U16' },
  '12': { id: 'bvoc', bytes: 4, fmt: 'F32' },
  '36': { id: 'tvoc_min', bytes: 4, fmt: 'F32' },
  '37': { id: 'tvoc_avg', bytes: 4, fmt: 'F32' },
  '38': { id: 'tvoc_max', bytes: 4, fmt: 'F32' },
  '39': { id: 'ethanol_equivalent', bytes: 4, fmt: 'F32' },
  '3A': { id: 'iaq_score', bytes: 4, fmt: 'F32' },
  '3B': { id: 'humidity_high_res', bytes: 2, fmt: 'U16', scale: 100 },
  '3F': { id: 'co2e_estimate', bytes: 4, fmt: 'F32' },
  '41': { id: 'battery_status', bytes: 1, fmt: 'U8' },
  '42': { id: 'battery_voltage', bytes: 2, fmt: 'U16' },
  '43': { id: 'rx_rssi', bytes: 2, fmt: 'S16' },
  '44': { id: 'rx_snr', bytes: 1, fmt: 'S8' },
  '45': { id: 'rx_count', bytes: 2, fmt: 'U16' },
  '46': { id: 'tx_time', bytes: 2, fmt: 'U16' },
  '47': { id: 'tx_power', bytes: 1, fmt: 'S8' },
  '48': { id: 'tx_count', bytes: 2, fmt: 'U16' },
  '49': { id: 'power_up_count', bytes: 2, fmt: 'U16' },
  '4A': { id: 'usb_insertion_count', bytes: 2, fmt: 'U16' },
  '4B': { id: 'login_ok_count', bytes: 2, fmt: 'U16' },
  '4C': { id: 'login_fail_count', bytes: 2, fmt: 'U16' },
  '4E': { id: 'cpu_temperature', bytes: 2, fmt: 'S16', scale: 10 },
  '50': { id: 'sound_min', bytes: 4, fmt: 'F32' },
  '51': { id: 'sound_avg', bytes: 4, fmt: 'F32' },
  '52': { id: 'sound_max', bytes: 4, fmt: 'F32' },
  '57': { id: 'pm1_0_mass', bytes: 4, fmt: 'F32' },
  '58': { id: 'pm2_5_mass', bytes: 4, fmt: 'F32' },
  '59': { id: 'pm4_0_mass', bytes: 4, fmt: 'F32' },
  '5A': { id: 'pm10_0_mass', bytes: 4, fmt: 'F32' },
  '5B': { id: 'pm0_5_number', bytes: 4, fmt: 'F32' },
  '5C': { id: 'pm1_0_number', bytes: 4, fmt: 'F32' },
  '5D': { id: 'pm2_5_number', bytes: 4, fmt: 'F32' },
  '5E': { id: 'pm4_0_number', bytes: 4, fmt: 'F32' },
  '5F': { id: 'pm10_0_number', bytes: 4, fmt: 'F32' },
  '60': { id: 'typical_particle_size', bytes: 4, fmt: 'F32' },
  '61': { id: 'plug_in_gas_id', bytes: 1, fmt: 'U8' },
  '66': { id: 'gas_concentration_ugm3', bytes: 4, fmt: 'F32' }
};

function _readVal(bytes, off, fmt) {
  function u(n) { var v = 0; for (var i = 0; i < n; i++) v = v * 256 + bytes[off + i]; return v; }
  function s(n) {
    var v = u(n);
    var bits = n * 8, sign = 1 << (bits - 1);
    return (v & (sign - 1)) - (v & sign);
  }
  if (fmt === 'U8') return bytes[off];
  if (fmt === 'U16') return u(2);
  if (fmt === 'U32') return u(4);
  if (fmt === 'S16') return s(2);
  if (fmt === 'S8') return s(1);
  if (fmt === 'F32') {
    var b = [bytes[off], bytes[off + 1], bytes[off + 2], bytes[off + 3]];
    var sign = b[0] & 0x80 ? -1 : 1;
    var expo = ((b[0] & 0x7f) << 1) | (b[1] >> 7);
    var mant = ((b[1] & 0x7f) << 16) | (b[2] << 8) | b[3];
    if (expo === 0 && mant === 0) return 0;
    if (expo === 255) return NaN;
    if (expo === 0) return sign * mant * Math.pow(2, -126 - 23);
    return sign * (1 + mant / 8388608) * Math.pow(2, expo - 127);
  }
  return null;
}

function _round(v, digits) {
  if (typeof v !== 'number' || !isFinite(v)) return v;
  var f = Math.pow(10, digits);
  return Math.round(v * f) / f;
}

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || !bytes.length) return out;
  var i = 0;
  while (i < bytes.length) {
    var t = bytes[i];
    var hx = ('0' + t.toString(16).toUpperCase()).slice(-2);
    if (t === 0xA5) {
      // ACK/NACK reply to a downlink: A5, result (0x06 = ACK), command
      if (i + 2 < bytes.length) {
        out.ack_result = bytes[i + 1];
        out.ack_command = bytes[i + 2];
        i += 3;
        var rest = bytes.length - i;
        if (rest === 2 && out.ack_command === 0x00) {
          out.firmware_version = bytes[i] + '.' + bytes[i + 1];
          i += 2;
        } else if (rest > 0) {
          i = bytes.length;
        }
      } else i = bytes.length;
      continue;
    }
    if (t === 0x00) {
      // system information: 00, sys id, payload
      if (i + 1 < bytes.length) {
        var sid = bytes[i + 1];
        if (sid === 0x00 && i + 4 <= bytes.length) {
          out.firmware_version = bytes[i + 2] + '.' + bytes[i + 3];
          i += 5;
        } else if (sid === 0x1E && i + 7 <= bytes.length) {
          var ser = '';
          for (var k = i + 2; k <= i + 6; k++) ser += ('0' + bytes[k].toString(16).toUpperCase()).slice(-2);
          out.plug_in_gas_serial = ser;
          i += 7;
        } else i = bytes.length;
      } else i = bytes.length;
      continue;
    }
    if (t === 0xFE) {
      // sensor fault: sensor id, fault code, U16 value
      if (i + 4 < bytes.length) {
        out.fault_sensor_id = bytes[i + 1];
        out.fault_code = bytes[i + 2];
        out.fault_value = _readVal(bytes, i + 3, 'U16');
        i += 5;
      } else i = bytes.length;
      continue;
    }
    if (t === 0x61 || t === 0x66) {
      // plug-in gas sensor: gas id + F32 concentration
      if (i + 5 < bytes.length) {
        out.plug_in_gas_id = bytes[i + 1];
        var gval = _readVal(bytes, i + 2, 'F32');
        if (t === 0x61) out.gas_concentration_ppb = _round(gval, 2);
        else out.gas_concentration_ugm3 = _round(gval, 2);
        i += 6;
      } else i = bytes.length;
      continue;
    }
    var el = _ELEMENTS[hx];
    if (!el) break;
    if (i + 1 + el.bytes > bytes.length) break;
    var raw = _readVal(bytes, i + 1, el.fmt);
    var val = el.scale ? raw / el.scale : raw;
    if (el.fmt === 'F32') val = _round(val, 2);
    else if (el.scale) val = _round(val, el.scale === 100 ? 2 : 1);
    out[el.id] = val;
    i += 1 + el.bytes;
  }
  return out;
}

function _toHex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16).toUpperCase()).slice(-2);
  return s;
}

function decodeUplink(input) {
  var data = _decode(input.bytes, input.fPort);
  data.raw_uplink = _toHex(input.bytes);
  return { data: data };
}
function Decode(fPort, bytes) {
  var data = _decode(bytes, fPort);
  data.raw_uplink = _toHex(bytes);
  return data;
}
function Decoder(bytes, port) {
  var data = _decode(bytes, port);
  data.raw_uplink = _toHex(bytes);
  return data;
}
