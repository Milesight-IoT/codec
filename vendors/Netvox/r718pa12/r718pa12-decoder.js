// Netvox R718PA12 - Wireless Seawater Dissolved Oxygen Sensor
// Source: R718PA12 User Manual (CN, section 5 Data Report) - http://www.netvox.com.cn/um/R718PA12%20%E4%BD%BF%E7%94%A8%E8%AF%B4%E6%98%8E%E4%B9%A6.pdf (fetched 2026-10-08)
// The manual states DeviceType 0x57 and that the device reports seawater dissolved oxygen concentration,
// dissolved oxygen saturation and temperature, and refers payload parsing to the Netvox LoRaWAN Application Command document:
// Source: Netvox LoRaWAN Application Command document, R718PA Series (DeviceType 0x57) - http://www.netvox.com.cn:8888/pages/deviceCmd?did=91&fport=0X06
// ReportType 0x0B = Battery(0.1V) + TemperaturewithLDO (signed, 0.01degC) + LDO DO value (0.01ppm) + LDO saturation (0.1%).
// Battery 0x00 means the device is powered by a DC power supply.
// Format example (layout from the command document, decoded with the vendor Command Resolver):
//   01570B0009C40FA003E800 -> DC powered, 25.00degC, DO 40.00ppm, saturation 100.0%
// Clean-room implementation derived from the vendor documents above only.

function _u16(b, o) {
  return (b[o] << 8) | b[o + 1];
}
function _s16(b, o) {
  var v = (b[o] << 8) | b[o + 1];
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
      case 0x0b:
        out.battery_voltage = bytes[3] / 10;
        out.temperature = _s16(bytes, 4) / 100;
        out.do_concentration = _u16(bytes, 6) / 100;
        out.do_saturation = _u16(bytes, 8) / 10;
        break;
    }
  }
  return out;
}
function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
