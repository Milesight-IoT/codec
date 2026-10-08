// Source: Netvox R718N3 Series User Manual (R718N3-usermanual.pdf), sections 5.1-5.2.
// FPort 0x06 uplink: Version(1) + DeviceType(1) + ReportType(1) + NetvoxPayLoadData(8), big-endian.
// FPort 0x07 uplink: CmdID(1) + DeviceType(1) + NetvoxPayLoadData(var). Set-type responses
// (0x81/0x83/0x87/0x9F) carry Status (0x00 success / 0x01 fail) in payload byte 0.
// Battery byte: bit0-6 = voltage * 0.1V, bit7 = 1 means low voltage.
// ReportTypeSet=0x00: two packets (RT 0x01 + 0x02); ReportTypeSet=0x01: one packet (RT 0x03).
// RT 0x01: Battery + Current1/2/3 (2B, mA) + Multiplier1.
// RT 0x02: Battery + Multiplier2 + Multiplier3.
// RT 0x03: Battery + Current1/2/3 + packed multiplier byte (2 bits each: 00=1, 01=5, 10=10, 11=100).
// RT 0x04: Battery + threshold alarm bits (bit0-5: low/high per channel).
// Actual current = CurrentN * MultiplierN (manual section 5.1 tips 3-4).

function _hex(bytes) {
  var out = '';
  for (var i = 0; i < bytes.length; i++) out += ('0' + bytes[i].toString(16)).slice(-2);
  return out.toUpperCase();
}

function _round(v, n) {
  var m = Math.pow(10, n);
  return Math.round(v * m) / m;
}

function _u16(hi, lo) {
  return ((hi << 8) | (lo & 0xff)) >>> 0;
}

var _MULT_LUT = [1, 5, 10, 100];

var _CURRENT_ALARMS = [
  'current_1_low_alarm', 'current_1_high_alarm',
  'current_2_low_alarm', 'current_2_high_alarm',
  'current_3_low_alarm', 'current_3_high_alarm'
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
      case 0x01: // packet 1: battery + currents + multiplier 1
        if (p.length >= 8) {
          out.battery_voltage = _round((p[0] & 0x7f) * 0.1, 1);
          out.battery_low = (p[0] >> 7) & 1;
          out.current_1 = _u16(p[1], p[2]);
          out.current_2 = _u16(p[3], p[4]);
          out.current_3 = _u16(p[5], p[6]);
          out.multiplier_1 = p[7];
        }
        break;
      case 0x02: // packet 2: battery + multiplier 2 + multiplier 3
        if (p.length >= 3) {
          out.battery_voltage = _round((p[0] & 0x7f) * 0.1, 1);
          out.battery_low = (p[0] >> 7) & 1;
          out.multiplier_2 = p[1];
          out.multiplier_3 = p[2];
        }
        break;
      case 0x03: // single packet: battery + currents + packed multipliers
        if (p.length >= 8) {
          out.battery_voltage = _round((p[0] & 0x7f) * 0.1, 1);
          out.battery_low = (p[0] >> 7) & 1;
          out.current_1 = _u16(p[1], p[2]);
          out.current_2 = _u16(p[3], p[4]);
          out.current_3 = _u16(p[5], p[6]);
          out.multiplier_1 = _MULT_LUT[p[7] & 0x03];
          out.multiplier_2 = _MULT_LUT[(p[7] >> 2) & 0x03];
          out.multiplier_3 = _MULT_LUT[(p[7] >> 4) & 0x03];
        }
        break;
      case 0x04: // battery + current threshold alarms
        if (p.length >= 2) {
          out.battery_voltage = _round((p[0] & 0x7f) * 0.1, 1);
          out.battery_low = (p[0] >> 7) & 1;
          for (var i = 0; i < _CURRENT_ALARMS.length; i++) {
            out[_CURRENT_ALARMS[i]] = (p[1] >> i) & 1;
          }
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
