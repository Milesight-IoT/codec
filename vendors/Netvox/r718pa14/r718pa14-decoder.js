// Netvox R718PA14 - Wireless Soil Volume Water Content / Temperature / Electrical Conductivity Sensor
// Source: R718PA14 User Manual (CN, section 5 Data Report) - http://www.netvox.com.cn/um/R718PA14%20%E4%BD%BF%E7%94%A8%E8%AF%B4%E6%98%8E%E4%B9%A6.pdf (fetched 2026-10-08)
// The manual states DeviceType 0x57 and that the device reports soil water content, soil temperature and soil EC,
// and refers payload parsing to the Netvox LoRaWAN Application Command document:
// Source: Netvox LoRaWAN Application Command document, R718PA Series (DeviceType 0x57) - http://www.netvox.com.cn:8888/pages/deviceCmd?did=91&fport=0X06
// ReportType 0x0A = Battery(0.1V) + SoilVWC (0.01%) + SoilTemperature (0.01degC) + WaterLevel (1cm) + Soil_EC (0.1dS/m).
// WaterLevel belongs to the shared 0x57/0x0A frame layout; the PA14 probe measures VWC/temperature/EC only.
// Battery 0x00 means the device is powered by a DC power supply.
// Format example (layout from the command document, decoded with the vendor Command Resolver):
//   01570A0013880BB801902E00 -> DC powered, 50.00%, 30.00degC, 400cm, 4.6dS/m
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
      case 0x0a:
        out.battery_voltage = bytes[3] / 10;
        out.soil_vwc = _u16(bytes, 4) / 100;
        out.soil_temperature = _u16(bytes, 6) / 100;
        out.water_level = _u16(bytes, 8);
        out.soil_ec = bytes[10] / 10;
        break;
    }
  }
  return out;
}
function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
