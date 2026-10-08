// Netvox R718Y - Wireless Differential Pressure and Temperature Sensor
// Source: R718Y User Manual (section 5.1 Example of ReportDataCmd) - http://www.netvox.com.tw/um/R718Y/R718YUsermanual.pdf
// Source: Netvox LoRaWAN Application Command document, R718Y (DeviceType 0xAC) - http://www.netvox.com.cn:8888/pages/deviceCmd?did=121&fport=0X06
// Uplink FPort 0x06: Version(1B, 0x01) | DeviceType(1B, 0xAC) | ReportType(1B) | NetvoxPayLoadData(8B fixed).
// ReportType 0x00 = version packet (SoftwareVersion 1B, HardwareVersion 1B, DateCode 4B, Reserved 2B).
// ReportType 0x01 = Battery(1B, 0.1V) + DifferentialPressure(Signed 2B, 0.1Pa) + Temperature(Signed 2B, 0.1°C)
//                  + ThresholdAlarm(1B: bit0 Low DiffPressure, bit1 High DiffPressure, bit2 Low Temperature,
//                  bit3 High Temperature; bit4-7 reserved - manual lists these 3 bytes as Reserved, command
//                  document details the alarm byte) + Reserved(2B).
// Manual example:
//   01AC0124001E0116000000 -> Battery 3.6V, Differential Pressure 3 Pa, Temperature 27.8°C, no alarms
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
  if (bytes[0] === 0x01 && bytes[1] === 0xac && bytes.length >= 11) {
    switch (bytes[2]) {
      case 0x00:
        out.software_version = _hex2(bytes[3]);
        out.hardware_version = _hex2(bytes[4]);
        out.date_code = _hex2(bytes[5]) + _hex2(bytes[6]) + _hex2(bytes[7]) + _hex2(bytes[8]);
        break;
      case 0x01:
        out.battery_voltage = bytes[3] / 10;
        out.differential_pressure = _s16(bytes, 4) / 10;
        out.temperature = _s16(bytes, 6) / 10;
        var alarm = bytes[8];
        out.low_differential_pressure_alarm = (alarm & 0x01) !== 0;
        out.high_differential_pressure_alarm = (alarm & 0x02) !== 0;
        out.low_temperature_alarm = (alarm & 0x04) !== 0;
        out.high_temperature_alarm = (alarm & 0x08) !== 0;
        break;
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
