// Source: Netvox R718EA User Manual (R718EA-usermanual.pdf), section 5.4.
// FPort 0x06 uplink: Version(1) + DeviceType(1) + ReportType(1) + NetvoxPayLoadData(8), big-endian.
// FPort 0x07 uplink: CmdID(1) + DeviceType(1) + NetvoxPayLoadData(var). Set-type responses
// (0x81/0x83/0x87/0x9F) carry Status (0x00 success / 0x01 fail) in payload byte 0.
// Battery byte: bit0-6 = voltage * 0.1V, bit7 = 1 means low voltage.
// Angles are 1-byte signed values in degrees; temperature is a 2-byte signed value * 0.1°C.

function _hex(bytes) {
  var out = '';
  for (var i = 0; i < bytes.length; i++) out += ('0' + bytes[i].toString(16)).slice(-2);
  return out.toUpperCase();
}

function _round(v, n) {
  var m = Math.pow(10, n);
  return Math.round(v * m) / m;
}

function _i8(b) {
  return b > 0x7f ? b - 0x100 : b;
}

function _i16(hi, lo) {
  var v = (hi << 8) | (lo & 0xff);
  return v > 0x7fff ? v - 0x10000 : v;
}

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
      case 0x01: // battery + 3-axis tilt angle + temperature
        if (p.length >= 6) {
          out.battery_voltage = _round((p[0] & 0x7f) * 0.1, 1);
          out.battery_low = (p[0] >> 7) & 1;
          out.angle_x = _i8(p[1]);
          out.angle_y = _i8(p[2]);
          out.angle_z = _i8(p[3]);
          out.temperature = _round(_i16(p[4], p[5]) * 0.1, 1);
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
