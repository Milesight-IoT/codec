// Source: Enless Wireless public payload format tables (EU868_Enless_LoRaWAN_Payload_decoder_Rev_10_01.xlsx, sheet "600-232")
// Product doc: Enless product sheet TX-TEMP-CONT2-600-232-V2.2-EN
// Note: dual-probe TX TEMP CONT2 carries Enless ref 600-232 (EU868); ref 600-034 is TX T&H EXT.
// Uplink frame: transmitter id bytes 0-2, frame type byte 3, sequential counter byte 4,
// firmware byte 5, then model-specific data, alarm status (2 bytes) and status (2 bytes).
function _s16(hi, lo) {
  var v = (hi << 8) | lo;
  if (v > 32767) v -= 65536;
  return v;
}
function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 6) return out;
  var hex = '';
  for (var i = 0; i < bytes.length; i++) hex += ('0' + bytes[i].toString(16)).slice(-2);
  out.raw_uplink = hex.toUpperCase();
  if (bytes[3] === 0x0c && bytes.length >= 14) {
    out.temperature_probe_1 = _s16(bytes[6], bytes[7]) / 10;
    out.temperature_probe_2 = _s16(bytes[8], bytes[9]) / 10;
    var alarm = (bytes[10] << 8) | bytes[11];
    out.probe_1_temp_high_alarm = alarm & 1;
    out.probe_1_temp_low_alarm = (alarm >> 1) & 1;
    out.probe_2_temp_high_alarm = (alarm >> 2) & 1;
    out.probe_2_temp_low_alarm = (alarm >> 3) & 1;
    var status = (bytes[12] << 8) | bytes[13];
    out.battery_level = [100, 75, 50, 25][(status >> 2) & 3];
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
