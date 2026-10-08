// Source: Netvox R718E User Manual (R718E-usermanual.pdf), sections 5.3-5.4.
// FPort 0x06 uplink: Version(1) + DeviceType(1) + ReportType(1) + NetvoxPayLoadData(8), big-endian.
// FPort 0x07 uplink: CmdID(1) + DeviceType(1) + NetvoxPayLoadData(var). Set-type responses
// (odd CmdID >= 0x81) carry Status (0x00 success / 0x01 fail) in payload byte 0.
// Battery byte: bit0-6 = voltage * 0.1V, bit7 = 1 means low voltage.
// Float16: the 2 payload bytes are the high 16 bits of an IEEE754 float32
// (byte-swapped on air), low 16 bits are zero, e.g. 0x303F -> 0x3F300000 = 0.6875.

function _hex(bytes) {
  var out = '';
  for (var i = 0; i < bytes.length; i++) out += ('0' + bytes[i].toString(16)).slice(-2);
  return out.toUpperCase();
}

function _round(v, n) {
  var m = Math.pow(10, n);
  return Math.round(v * m) / m;
}

function _i16(hi, lo) {
  var v = (hi << 8) | (lo & 0xff);
  return v > 0x7fff ? v - 0x10000 : v;
}

function _f16(hi, lo) {
  var dv = new DataView(new ArrayBuffer(4));
  dv.setUint16(0, ((lo & 0xff) << 8) | (hi & 0xff));
  return dv.getFloat32(0);
}

function _battery(out, b) {
  out.battery_voltage = _round((b & 0x7f) * 0.1, 1);
  out.battery_low = (b >> 7) & 1;
}

function _bits(out, byte, names) {
  for (var i = 0; i < names.length; i++) out[names[i]] = (byte >> i) & 1;
}

var _ANGLE_ALARMS = [
  'angle_x_low_alarm', 'angle_x_high_alarm',
  'angle_y_low_alarm', 'angle_y_high_alarm',
  'angle_z_low_alarm', 'angle_z_high_alarm'
];

var _ACCEL_ALARMS = [
  'accel_x_low_alarm', 'accel_x_high_alarm',
  'accel_y_low_alarm', 'accel_y_high_alarm',
  'accel_z_low_alarm', 'accel_z_high_alarm'
];

var _VELOCITY_ALARMS = [
  'velocity_x_low_alarm', 'velocity_x_high_alarm',
  'velocity_y_low_alarm', 'velocity_y_high_alarm',
  'velocity_z_low_alarm', 'velocity_z_high_alarm'
];

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 4) return out;
  out.raw_uplink = _hex(bytes);
  if (fPort === 0x06) {
    var p = bytes.slice(3);
    switch (bytes[2]) {
      case 0x00: // version packet
        if (p.length >= 6) {
          var d2 = function (b) { return '' + (b >> 4) + (b & 0x0f); };
          var s = d2(p[2]) + d2(p[3]) + d2(p[4]) + d2(p[5]);
          out.firmware_version = s.slice(0, 4) + '.' + s.slice(4, 6) + '.' + s.slice(6, 8);
        }
        break;
      case 0x01: // battery + 3-axis acceleration + activity status
        if (p.length >= 8) {
          _battery(out, p[0]);
          out.accel_x = _round(_f16(p[1], p[2]), 6);
          out.accel_y = _round(_f16(p[3], p[4]), 6);
          out.accel_z = _round(_f16(p[5], p[6]), 6);
          out.activity_status = p[7] & 1;
        }
        break;
      case 0x02: // 3-axis velocity + temperature (no battery in this packet)
        if (p.length >= 8) {
          out.velocity_x = _round(_f16(p[0], p[1]), 6);
          out.velocity_y = _round(_f16(p[2], p[3]), 6);
          out.velocity_z = _round(_f16(p[4], p[5]), 6);
          out.temperature = _round(_i16(p[6], p[7]) * 0.1, 1);
        }
        break;
      case 0x03: // battery + 3-axis angle + angle threshold alarm
        if (p.length >= 8) {
          _battery(out, p[0]);
          out.angle_x = _round(_i16(p[1], p[2]) * 0.005, 3);
          out.angle_y = _round(_i16(p[3], p[4]) * 0.005, 3);
          out.angle_z = _round(_i16(p[5], p[6]) * 0.005, 3);
          _bits(out, p[7], _ANGLE_ALARMS);
        }
        break;
      case 0x04: // battery + acceleration/velocity/temperature threshold alarms
        if (p.length >= 8) {
          _battery(out, p[0]);
          _bits(out, p[1], _ACCEL_ALARMS);
          _bits(out, p[2], _VELOCITY_ALARMS);
          _bits(out, p[3], ['temperature_low_alarm', 'temperature_high_alarm']);
        }
        break;
    }
  } else if (fPort === 0x07) {
    var cmd = bytes[0];
    if ((cmd === 0x81 || cmd === 0x83 || cmd === 0x87 || cmd === 0x9F) && bytes.length >= 3) {
      out.config_status = bytes[2]; // 0x00 success / 0x01 fail
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
