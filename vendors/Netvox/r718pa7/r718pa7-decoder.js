// Netvox R718PA7 - Wireless Noise Sensor (RS485 sensor)
// Source: R718PA7 User Manual (section 5.1 Example of ReportDataCmd) - http://www.netvox.com.tw/um/R718PA7/R718PA7Usermanual.pdf
// Source: Netvox LoRaWAN Application Command document, R718PA Series (DeviceType 0x57, ReportType 0x07) - http://www.netvox.com.cn:8888/pages/deviceCmd?did=91&fport=0X06
// Uplink FPort 0x06: Version(1B, 0x01) | DeviceType(1B, 0x57) | ReportType(1B) | NetvoxPayLoadData(8B fixed).
// ReportType 0x00 = version packet (SoftwareVersion 1B, HardwareVersion 1B, DateCode 4B, Reserved 2B).
// ReportType 0x07 = Battery(1B, 0.1V; 0x00 = DC powered) + CO2/NH3 (each 2B, 0.1ppm, 0xFFFF = N/A) + Noise(2B, 0.1dB) + Reserved(1B).
// R718PA7 measures noise; CO2/NH3 are reported as 0xFFFF (N/A).
// Manual examples:
//   01570700FFFFFFFF025800 -> DC powered, CO2 N/A, NH3 N/A, Noise 60.0 dB
//   0157000B04202306010000 -> version packet, firmware date 2023.06.01
// Clean-room implementation derived from the vendor documents above only.

function _u16(b, o) {
  return (b[o] << 8) | b[o + 1];
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
  if (bytes[0] === 0x01 && bytes[1] === 0x57 && bytes.length >= 11) {
    switch (bytes[2]) {
      case 0x00:
        out.software_version = _hex2(bytes[3]);
        out.hardware_version = _hex2(bytes[4]);
        out.date_code = _hex2(bytes[5]) + _hex2(bytes[6]) + _hex2(bytes[7]) + _hex2(bytes[8]);
        break;
      case 0x07:
        out.battery_voltage = bytes[3] / 10;
        var co2 = _u16(bytes, 4);
        out.co2 = co2 === 0xFFFF ? null : co2 / 10;
        var nh3 = _u16(bytes, 6);
        out.nh3 = nh3 === 0xFFFF ? null : nh3 / 10;
        out.noise = _u16(bytes, 8) / 10;
        break;
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
