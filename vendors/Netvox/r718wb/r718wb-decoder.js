// Netvox R718WB - Wireless Water Leak Detector
// Source: R718WB User Manual (section 5.1 Example of ReportDataCmd) - http://www.netvox.com.tw/um/R718WB/R718WBUsermanual.pdf
// Uplink FPort 0x06: Version(1B, 0x01) | DeviceType(1B, 0x12) | ReportType(1B) | NetvoxPayLoadData(8B fixed).
// ReportType 0x00 = version packet (SoftwareVersion 1B, HardwareVersion 1B, DateCode 4B, Reserved 2B).
// ReportType 0x01 = Battery(1B; bit0-bit6 = 0.1V, bit7 = 1 low voltage) + WaterLeak(1B, 0 = no leak, 1 = leak) + Reserved(6B).
// Manual examples:
//   0112012401000000000000 -> Battery 3.6V, Water Leak: leak
//   0112000A0B202005200000 -> version packet, firmware date 2020.05.20
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
  if (bytes[0] === 0x01 && bytes[1] === 0x12 && bytes.length >= 11) {
    switch (bytes[2]) {
      case 0x00:
        out.software_version = _hex2(bytes[3]);
        out.hardware_version = _hex2(bytes[4]);
        out.date_code = _hex2(bytes[5]) + _hex2(bytes[6]) + _hex2(bytes[7]) + _hex2(bytes[8]);
        break;
      case 0x01:
        out.battery_voltage = (bytes[3] & 0x7f) / 10;
        out.battery_low_voltage = (bytes[3] & 0x80) !== 0;
        out.water_leak = bytes[4] === 0x01;
        break;
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
