// Netvox R718PA6 - Wireless SO2 Sensor (RS485 sensor)
// Source: R718PA6 User Manual (section 5 Data Report) - http://www.netvox.com.tw/um/R718PA6/R718PA6Usermanual.pdf
// Source: Netvox LoRaWAN Application Command document, R718PA Series (DeviceType 0x57, ReportType 0x06) - http://www.netvox.com.cn:8888/pages/deviceCmd?did=91&fport=0X06
// Uplink FPort 0x06: Version(1B, 0x01) | DeviceType(1B, 0x57) | ReportType(1B) | NetvoxPayLoadData(8B fixed).
// ReportType 0x00 = version packet (SoftwareVersion 1B, HardwareVersion 1B, DateCode 4B, Reserved 2B).
// ReportType 0x06 = Battery(1B, 0.1V; 0x00 = DC powered) + NO2/SO2/H2S (each 2B, 0.1ppm, 0xFFFF = N/A) + Reserved(1B).
// R718PA6 measures SO2; NO2/H2S are reported as 0xFFFF (N/A).
// Example (constructed from the ReportType 0x06 layout; the manual itself carries no uplink example):
//   01570600FFFF0005FFFF00 -> DC powered, NO2 N/A, SO2 0.5 ppm, H2S N/A
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
      case 0x06:
        out.battery_voltage = bytes[3] / 10;
        var no2 = _u16(bytes, 4);
        out.no2 = no2 === 0xFFFF ? null : no2 / 10;
        var so2 = _u16(bytes, 6);
        out.so2 = so2 === 0xFFFF ? null : so2 / 10;
        var h2s = _u16(bytes, 8);
        out.h2s = h2s === 0xFFFF ? null : h2s / 10;
        break;
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
