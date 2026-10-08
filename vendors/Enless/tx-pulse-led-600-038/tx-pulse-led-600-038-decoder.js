// Source: Enless Wireless official LoRaWAN payload specification (EU868 decoder Excel Rev 10.01, sheet 600-038) - frame type 0x0A - datasheet: https://enless-wireless.com/wp-content/uploads/2026/04/TX-PULSE-LED-600-038-V2.2-EN.pdf
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
  if (type === 10 && bytes.length >= 22) {
    out.transmitter_id = _u24(bytes, 0);
    out.frame_type = type;
    out.sequential_counter = bytes[4];
    out.firmware_version = bytes[5] & 0x3f;
    out.pulse_ch1 = _u32(bytes, 6);
    out.pulse_ch2 = _u32(bytes, 10);
    out.pulse_oc = _u32(bytes, 14);
    out.alarm_status = _u16(bytes, 18);
    out.status = _u16(bytes, 20);
    out.battery_level = _batteryPct(out.status);
    out.alarm_active = out.alarm_status !== 0 ? 1 : 0;
  }
  return out;
}
function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
