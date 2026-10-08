// Netvox R718NL325 - Wireless Light Sensor and 3-Phase Current Meter with 3 x 250A Clamp-On CT
// Source: R718NL3 Series User Manual (section 5 Data Report) - http://www.netvox.com.tw/um/R718NL325/R718NL325Usermanual.pdf (fetched 2026-10-08)
// Source: Netvox LoRaWAN Application Command document, R718NL3 Series (DeviceType 0x99) - http://www.netvox.com.cn:8888/pages/deviceCmd?did=464&fport=0X06
// Uplink FPort 0x06: Version(1B, 0x01) | DeviceType(1B, 0x99) | ReportType(1B) | NetvoxPayLoadData(8B fixed).
// ReportType 0x00 = version packet; 0x01 = Battery(0.1V) + Current1/2/3(1mA) + Multiplier1;
// 0x02 = Battery(0.1V) + Multiplier2 + Multiplier3 + Illuminance(1Lux) + ThresholdAlarm_NL3 bit flags
// (Bit0 LowCurrent1 ... Bit7 HighIlluminance; manual lists byte 11 as reserved, current command doc defines the alarm bits).
// Real current = current value * its multiplier. Manual examples:
//   0199012405DC07D009C401 -> 3.6V, 1500/2000/2500mA, multiplier1=1
//   0199022401010000000300 -> 3.6V, multiplier2=1, multiplier3=1, 3lx, no alarms
// Clean-room implementation derived from the vendor documents above only.

function _u16(b, o) {
  return (b[o] << 8) | b[o + 1];
}
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
  if (bytes[0] === 0x01 && bytes[1] === 0x99 && bytes.length >= 11) {
    switch (bytes[2]) {
      case 0x00:
        out.software_version = _hex2(bytes[3]);
        out.hardware_version = _hex2(bytes[4]);
        out.date_code = _hex2(bytes[5]) + _hex2(bytes[6]) + _hex2(bytes[7]) + _hex2(bytes[8]);
        break;
      case 0x01:
        out.battery_voltage = bytes[3] / 10;
        out.current1 = _u16(bytes, 4);
        out.current2 = _u16(bytes, 6);
        out.current3 = _u16(bytes, 8);
        out.multiplier1 = bytes[10];
        break;
      case 0x02:
        out.battery_voltage = bytes[3] / 10;
        out.multiplier2 = bytes[4];
        out.multiplier3 = bytes[5];
        out.illuminance = _u32(bytes, 6);
        var flags = bytes[10];
        out.low_current1_alarm = (flags & 0x01) !== 0;
        out.high_current1_alarm = (flags & 0x02) !== 0;
        out.low_current2_alarm = (flags & 0x04) !== 0;
        out.high_current2_alarm = (flags & 0x08) !== 0;
        out.low_current3_alarm = (flags & 0x10) !== 0;
        out.high_current3_alarm = (flags & 0x20) !== 0;
        out.low_illuminance_alarm = (flags & 0x40) !== 0;
        out.high_illuminance_alarm = (flags & 0x80) !== 0;
        break;
    }
  }
  return out;
}
function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
