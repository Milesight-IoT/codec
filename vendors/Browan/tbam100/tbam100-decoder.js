// Source: Browan TBAM100 (TABS Ambient Light Sensor, TBAM100-915 / TBAM100-868)
//        Instruction Manual, section "Messages / Uplink Payload"
// Uplink frame: fPort 104, fixed 6 bytes
//   Byte 0      Status   bit0: 1=darker (0=lighter or not change)
//                        bit1: 1=lighter (0=darker or not change)
//                        bit4: 1=status change (0=not status change)
//                        bit5: 1=keep-alive (0=not keep-alive)
//                        bits2-3,6-7: RFU
//   Byte 1      Battery  low nibble = unsigned value 1-14; volts = (25 + v) / 10
//   Byte 2      Temp     low 7 bits = unsigned value 0-127; celsius = value - 32
//   Bytes 3-5   Lux      24-bit unsigned little-endian; lux = value / 100

function _toHex(bytes) {
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    hex += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
  }
  return hex.toUpperCase();
}

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length === 0) return out;
  out.raw_uplink = _toHex(bytes);
  if (bytes.length < 6) return out;
  if (fPort !== undefined && fPort !== 104) return out;

  var status = bytes[0];
  out.status_darker = (status >> 0) & 0x01;
  out.status_lighter = (status >> 1) & 0x01;
  out.status_changed = (status >> 4) & 0x01;
  out.keep_alive = (status >> 5) & 0x01;

  out.battery_voltage = (25 + (bytes[1] & 0x0f)) / 10;

  out.temperature = (bytes[2] & 0x7f) - 32;

  var luxRaw = bytes[3] | (bytes[4] << 8) | (bytes[5] << 16);
  out.illuminance = luxRaw / 100;

  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
