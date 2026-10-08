// Netvox R718PB15 - Wireless Soil Moisture/Temperature/EC (and Water Level) Sensor
// Source: R718PB15 User Manual (section 5.1 Example of ReportDataCmd) - http://www.netvox.com.tw/um/R718PB15/R718PB15Usermanual.pdf
// Source: Netvox LoRaWAN Application Command document, R718PB Series (DeviceType 0x58) - http://www.netvox.com.cn:8888/pages/deviceCmd?did=465&fport=0X06
// Uplink FPort 0x06: Version(1B, 0x01) | DeviceType(1B, 0x58) | ReportType(1B) | NetvoxPayLoadData(8B fixed).
// ReportType 0x00 = version packet (SoftwareVersion 1B, HardwareVersion 1B, DateCode 4B, Reserved 2B).
// Soil EC unit is configurable: 0x01 -> 0.1 dS/m (ReportType 0x0A); 0x02 -> 0.001 dS/m (ReportType 0x10).
// ReportType 0x0A = Battery(1B, 0.1V) + SoilVWC(2B, 0.01%) + SoilTemperature(Signed 2B, 0.01°C) + WaterLevel(2B, 1cm, 0xFFFF = N/A) + Soil_EC(1B, 0.1dS/m).
// ReportType 0x10 = Battery(1B, 0.1V) + SoilVWC(2B, 0.01%) + SoilTemperature(Signed 2B, 0.01°C) + Soil_EC(2B, 0.001dS/m) + Reserved(1B).
// Manual examples:
//   01580A2420C30837FFFF24 -> Battery 3.6V, Soil VWC 83.87%, Soil Temperature 21.03°C, Water Level N/A, Soil EC 3.6 dS/m
//   0158102420C308370E5F00 -> Battery 3.6V, Soil VWC 83.87%, Soil Temperature 21.03°C, Soil EC 3.679 dS/m
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
      case 0x0a:
        out.battery_voltage = bytes[3] / 10;
        out.soil_moisture = _u16(bytes, 4) / 100;
        out.soil_temperature = _s16(bytes, 6) / 100;
        var wl = _u16(bytes, 8);
        out.water_level = wl === 0xFFFF ? null : wl;
        out.soil_ec = bytes[10] / 10;
        break;
      case 0x10:
        out.battery_voltage = bytes[3] / 10;
        out.soil_moisture = _u16(bytes, 4) / 100;
        out.soil_temperature = _s16(bytes, 6) / 100;
        out.soil_ec = _u16(bytes, 8) / 1000;
        break;
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
