// Netvox R720FLT - Wireless Toilet Tank Replenish Water Counter and Leak Detector
// Source: R720FLT User Manual (section 5.1 Example of ReportDataCmd) - http://www.netvox.com.tw/um/R720FLT/R720FLTUsermanual.pdf
// Source: Netvox LoRaWAN Application Command document, R720FLT (DeviceType 0xD4) - http://www.netvox.com.cn:8888/pages/deviceCmd?did=580&fport=0X06
// Uplink FPort 0x06: Version(1B, 0x01) | DeviceType(1B, 0xD4) | ReportType(1B) | NetvoxPayLoadData(8B fixed).
// ReportType 0x00 = version packet (SoftwareVersion 1B, HardwareVersion 1B, DateCode 4B, Reserved 2B).
// ReportType 0x01 = Battery(1B; bit0-bit6 = 0.1V, bit7 = 1 low voltage) + ReplenishWaterCount(4B)
//                  + FaultAlarm(1B, 0 = off, 1 = on) + TankLeakAlarm(1B, 0x00 = no leak, 0x01 = leak) + Reserved(1B).
// Manual examples:
//   01D401240000002F000000 -> Battery 3.6V, Replenish water count 47, no fault alarm, no tank leak
//   01D4019F00000168010000 -> Battery 3.1V (low battery), Replenish water count 360, fault alarm on, no tank leak
//   01D4000A0B202302110000 -> version packet, firmware date 2023.02.11
// Clean-room implementation derived from the vendor documents above only.

function _u32(b, o) {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
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
  if (bytes[0] === 0x01 && bytes[1] === 0xd4 && bytes.length >= 11) {
    switch (bytes[2]) {
      case 0x00:
        out.software_version = _hex2(bytes[3]);
        out.hardware_version = _hex2(bytes[4]);
        out.date_code = _hex2(bytes[5]) + _hex2(bytes[6]) + _hex2(bytes[7]) + _hex2(bytes[8]);
        break;
      case 0x01:
        out.battery_voltage = (bytes[3] & 0x7f) / 10;
        out.battery_low_voltage = (bytes[3] & 0x80) !== 0;
        out.replenish_water_count = _u32(bytes, 4);
        out.fault_alarm = bytes[8] === 0x01;
        out.tank_leak_alarm = bytes[9] === 0x01;
        break;
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
