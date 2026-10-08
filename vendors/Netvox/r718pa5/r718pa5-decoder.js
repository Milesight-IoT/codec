// Netvox R718PA5 - Wireless NO2 Sensor
// Source: R718PA5 User Manual (section 5.1 Example of ReportDataCmd) - http://www.netvox.com.tw/um/R718PA5/R718PA5Usermanual.pdf (fetched 2026-10-08)
// Source: Netvox LoRaWAN Application Command document, R718PA Series (DeviceType 0x57) - http://www.netvox.com.cn:8888/pages/deviceCmd?did=91&fport=0X06
// Uplink FPort 0x06: Version(1B, 0x01) | DeviceType(1B, 0x57) | ReportType(1B) | NetvoxPayLoadData(8B fixed).
// ReportType 0x00 = version packet; 0x06 = Battery(0.1V) + NO2/SO2/H2S (unit 0.1ppm, 0xFFFF = N/A).
// Battery 0x00 means the device is powered by a DC power supply.
// Manual example: 015706000032FFFFFFFF00 -> DC powered, NO2 5.0ppm, SO2 N/A, H2S N/A.
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
