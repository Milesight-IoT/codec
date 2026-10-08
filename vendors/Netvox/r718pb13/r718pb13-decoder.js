// Netvox R718PB13 - Wireless Turbidity and Soil Moisture/Temperature Sensor
// Source: R718PB13 User Manual (section 5.1 Example of ReportDataCmd) - http://www.netvox.com.tw/um/R718PB13/R718PB13Usermanual.pdf
// Source: Netvox LoRaWAN Application Command document, R718PB Series (DeviceType 0x58, ReportType 0x09) - http://www.netvox.com.cn:8888/pages/deviceCmd?did=465&fport=0X06
// Uplink FPort 0x06: Version(1B, 0x01) | DeviceType(1B, 0x58) | ReportType(1B) | NetvoxPayLoadData(8B fixed).
// ReportType 0x00 = version packet (SoftwareVersion 1B, HardwareVersion 1B, DateCode 4B, Reserved 2B).
// ReportType 0x09 = Battery(1B; bit0-bit6 = 0.1V, bit7 = 1 low voltage) + NTU(2B, 0.1ntu, 0xFFFF = N/A)
//                  + TemperatureWithNTU(Signed 2B, 0.01°C, 0xFFFF = N/A) + SoilVWC(2B, 0.01%) + Reserved(1B).
// Manual examples:
//   01580924FFFFFFFF0B1C00 -> Battery 3.6V, NTU N/A, Temperature N/A, Soil VWC 28.44%
//   0158000A04202202250000 -> version packet, firmware date 2022.02.25
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
  if (bytes[0] === 0x01 && bytes[1] === 0x58 && bytes.length >= 11) {
    switch (bytes[2]) {
      case 0x00:
        out.software_version = _hex2(bytes[3]);
        out.hardware_version = _hex2(bytes[4]);
        out.date_code = _hex2(bytes[5]) + _hex2(bytes[6]) + _hex2(bytes[7]) + _hex2(bytes[8]);
        break;
      case 0x09:
        out.battery_voltage = (bytes[3] & 0x7f) / 10;
        out.battery_low_voltage = (bytes[3] & 0x80) !== 0;
        var ntu = _u16(bytes, 4);
        out.turbidity = ntu === 0xFFFF ? null : ntu / 10;
        var t = _s16(bytes, 6);
        out.temperature = t === -1 ? null : t / 100;
        out.soil_moisture = _u16(bytes, 8) / 100;
        break;
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
