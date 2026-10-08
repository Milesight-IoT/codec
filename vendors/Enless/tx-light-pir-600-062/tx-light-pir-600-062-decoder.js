// Source: Enless Wireless official LoRaWAN payload specification (EU868 decoder Excel Rev 10.01, sheet 600-062) - frame types 0x22 (data) / 0x03 (config response) - datasheet: https://enless-wireless.com/wp-content/uploads/2026/04/TX-LIGHT-PIR-TH-600-062-V2.2-EN.pdf
function _hex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16)).slice(-2);
  return s.toUpperCase();
}
function _u16(b, o) { return (b[o] << 8) | b[o + 1]; }
function _u32(b, o) { return (((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0); }
function _u24(b, o) { return (b[o] << 16) | (b[o + 1] << 8) | b[o + 2]; }
function _batteryPct(status) {
  var lvl = (status >> 2) & 3;
  if (lvl === 0) return 100;
  if (lvl === 1) return 75;
  if (lvl === 2) return 50;
  return 25;
}
function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 6) return out;
  out.raw_uplink = _hex(bytes);
  var type = bytes[3];
  if (type === 34 && bytes.length >= 30) {
    out.transmitter_id = _u24(bytes, 0);
    out.frame_type = 34;
    out.sequential_counter = bytes[4];
    out.firmware_version = bytes[5] & 0x3f;
    out.temperature = _u16(bytes, 6) / 10;
    out.humidity = _u16(bytes, 10) / 10;
    out.pir_count = _u16(bytes, 16);
    out.luminosity = _u32(bytes, 22);

    out.alarm_status = _u16(bytes, 26);
    out.status = _u16(bytes, 28);
    out.battery_level = _batteryPct(out.status);

    out.alarm_active = out.alarm_status !== 0 ? 1 : 0;
  } else if (type === 3 && bytes.length >= 10) {
    out.frame_type = 3;
    out.periodicity_min = _u16(bytes, 6) / 60;
    out.sample_period_min = _u16(bytes, 8) / 60;
  }
  return out;
}
function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
