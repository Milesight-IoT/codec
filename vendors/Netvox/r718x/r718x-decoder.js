// Netvox R718X - Wireless Ultrasonic Distance Detection Sensor
// Source: R718X User Manual (section 5.1 Example of ReportDataCmd) - http://www.netvox.com.tw/um/R718X/R718XUsermanual.pdf
// Uplink FPort 0x06: Version(1B, 0x01) | DeviceType(1B, 0x34) | ReportType(1B) | NetvoxPayLoadData(8B fixed).
// ReportType 0x00 = version packet (SoftwareVersion 1B, HardwareVersion 1B, DateCode 4B, Reserved 2B).
// ReportType 0x01 = Battery(1B; bit0-bit6 = 0.1V, bit7 = 1 low voltage) + Status(1B, 0x01 = On, 0x00 = Off)
//                  + Distance(2B, 1mm) + Temperature(Signed 2B, 0.1°C) + FillLevel(1B, 1%) + Reserved(1B;
//                  the Inclination byte of the table is not supported from 2021.10.01, examples parse it as reserved).
// ReportType 0x02 = Battery(1B) + ThresholdAlarm(1B bitmask: bit0 Low Distance, bit1 High Distance, bit2 Low Temperature,
//                  bit3 High Temperature, bit4 Low FillLevel, bit5 High FillLevel; bit6-7 reserved) + Reserved(6B).
// Manual examples:
//   0134019F0000C801275A00 -> Battery 3.1V (low voltage flag set), Status Off, Distance 200mm, Temperature 29.5°C, FillLevel 90%
//   0134029F01000000000000 -> Battery 3.1V (low voltage), ThresholdAlarm: Low Distance Alarm
//   0134000A01202404010000 -> version packet, firmware date 2024.04.01
// Clean-room implementation derived from the vendor documents above only.

function _u16(b, o) {
  return (b[o] << 8) | b[o + 1];
}
function _s16(b, o) {
  var v = _u16(b, o);
  return v >= 0x8000 ? v - 0x10000 : v;
}
function _hex2(v) {
  return (v < 16 ? '0' : '') + v.toString(16).toUpperCase();
}
function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length === 0) return out;
  var hex = '';
  for (var i = 0; i < bytes.length; i++) hex += _hex2(bytes[i]);
  out.raw_uplink = hex;
  if (bytes[0] === 0x01 && bytes[1] === 0x34 && bytes.length >= 11) {
    switch (bytes[2]) {
      case 0x00:
        out.software_version = _hex2(bytes[3]);
        out.hardware_version = _hex2(bytes[4]);
        out.date_code = _hex2(bytes[5]) + _hex2(bytes[6]) + _hex2(bytes[7]) + _hex2(bytes[8]);
        break;
      case 0x01:
        out.battery_voltage = (bytes[3] & 0x7f) / 10;
        out.battery_low_voltage = (bytes[3] & 0x80) !== 0;
        out.status = bytes[4] === 0x01;
        out.distance = _u16(bytes, 5);
        out.temperature = _s16(bytes, 7) / 10;
        out.fill_level = bytes[9];
        break;
      case 0x02:
        out.battery_voltage = (bytes[3] & 0x7f) / 10;
        out.battery_low_voltage = (bytes[3] & 0x80) !== 0;
        var alarm = bytes[4];
        out.low_distance_alarm = (alarm & 0x01) !== 0;
        out.high_distance_alarm = (alarm & 0x02) !== 0;
        out.low_temperature_alarm = (alarm & 0x04) !== 0;
        out.high_temperature_alarm = (alarm & 0x08) !== 0;
        out.low_fill_level_alarm = (alarm & 0x10) !== 0;
        out.high_fill_level_alarm = (alarm & 0x20) !== 0;
        break;
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
