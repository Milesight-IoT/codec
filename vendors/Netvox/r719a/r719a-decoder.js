// Netvox R719A - Wireless Parking Occupancy Detection Sensor (geomagnetic)
// Source: R719A User Manual (section 5.1 Example of ReportDataCmd) - http://www.netvox.com.tw/um/R719A/R719AUsermanual.pdf
// Source: Netvox LoRaWAN Application Command document, R719A (DeviceType 0x59) - http://www.netvox.com.cn:8888/pages/deviceCmd?did=488&fport=0X06
// Uplink FPort 0x06: Version(1B, 0x01) | DeviceType(1B, 0x59) | ReportType(1B) | NetvoxPayLoadData(8B fixed).
// ReportType 0x00 = version packet (SoftwareVersion 1B, HardwareVersion 1B, DateCode 4B, Reserved 2B).
// ReportType 0x01 = Battery(1B; bit0-bit6 = 0.1V, bit7 = 1 low voltage) + CarOnOff(1B, 0 = off, 1 = on)
//                  + Reserved For Netvox Internal Use (6B, to be ignored in user's payload decoder).
// Manual examples:
//   0159012401000000000000 -> Battery 3.6V, Car OnOff: on
//   0159000A0B202005200000 -> version packet, firmware date 2020.05.20
// Clean-room implementation derived from the vendor documents above only.

function _hex2(v) {
  return (v < 16 ? '0' : '') + v.toString(16).toUpperCase();
}
function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length === 0) return out;
  var hex = '';
  for (var i = 0; i < bytes.length; i++) hex += _hex2(bytes[i]);
  out.raw_uplink = hex;
  if (bytes[0] === 0x01 && bytes[1] === 0x59 && bytes.length >= 11) {
    switch (bytes[2]) {
      case 0x00:
        out.software_version = _hex2(bytes[3]);
        out.hardware_version = _hex2(bytes[4]);
        out.date_code = _hex2(bytes[5]) + _hex2(bytes[6]) + _hex2(bytes[7]) + _hex2(bytes[8]);
        break;
      case 0x01:
        out.battery_voltage = (bytes[3] & 0x7f) / 10;
        out.battery_low_voltage = (bytes[3] & 0x80) !== 0;
        out.car_status = bytes[4] === 0x01;
        break;
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
