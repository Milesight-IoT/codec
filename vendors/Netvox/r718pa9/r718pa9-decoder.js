// Netvox R718PA9 - Wireless ORP Sensor (RS485 sensor)
// Source: R718PA9 User Manual (section 5 Data Report) - http://www.netvox.com.tw/um/R718PA9/R718PA9Usermanual.pdf
// Source: Netvox LoRaWAN Application Command document, R718PA Series (DeviceType 0x57, ReportType 0x08) - http://www.netvox.com.cn:8888/pages/deviceCmd?did=91&fport=0X06
// Uplink FPort 0x06: Version(1B, 0x01) | DeviceType(1B, 0x57) | ReportType(1B) | NetvoxPayLoadData(8B fixed).
// ReportType 0x00 = version packet (SoftwareVersion 1B, HardwareVersion 1B, DateCode 4B, Reserved 2B).
// ReportType 0x08 = Battery(1B, 0.1V; 0x00 = DC powered) + PH(2B, 0.01pH) + TemperatureWithPH(Signed 2B, 0.01°C) + ORP(Signed 2B, 1mV) + Reserved(1B).
// R718PA9 measures ORP only; pH/Temperature are reported as 0xFFFF (N/A). Field layout is shared across the R718PA series (ReportType 0x08).
// Example (constructed from the ReportType 0x08 layout; the manual itself carries no uplink example):
//   01570800FFFFFFFF006400 -> DC powered, pH N/A, Temperature N/A, ORP 100 mV
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
  if (bytes[0] === 0x01 && bytes[1] === 0x57 && bytes.length >= 11) {
    switch (bytes[2]) {
      case 0x00:
        out.software_version = _hex2(bytes[3]);
        out.hardware_version = _hex2(bytes[4]);
        out.date_code = _hex2(bytes[5]) + _hex2(bytes[6]) + _hex2(bytes[7]) + _hex2(bytes[8]);
        break;
      case 0x08:
        out.battery_voltage = bytes[3] / 10;
        var ph = _u16(bytes, 4);
        out.ph = ph === 0xFFFF ? null : ph / 100;
        var t = _s16(bytes, 6);
        out.temperature = t === -1 ? null : t / 100;
        var orp = _s16(bytes, 8);
        out.orp = orp === -1 ? null : orp;
        break;
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
