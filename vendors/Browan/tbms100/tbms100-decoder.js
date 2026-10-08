// Source: Tabs Sensors Application Payload Specification V1.1 (TrackNet), Motion Sensor, Port 102
// Cross-validated: TBMS100 Reference Manual (TrackNet Inc, 2017) section 4.1.3 payload layout
// Uplink: port 102, 8 bytes, multi-byte fields little-endian
//   byte 0     Status  bit[0]: 1 = occupied, 0 = free; bits[7:1] RFU
//   byte 1     Battery bits[3:0]: level 1-14, voltage V = (25 + v) / 10, remaining % = 100 * v / 15; bits[7:4] RFU
//   byte 2     Temp    bits[6:0]: raw 0-127, temperature in deg C = v - 32; bit[7] RFU
//   bytes 3-4  Time    uint16 LE, minutes since last event trigger, 0-65535
//   bytes 5-7  Count   uint24 LE, total event trigger count, not persistent across power cycles
// Downlink: port 102, 5 bytes, byte 0 Cmd = 0x01 (set configuration),
//   bytes 1-4 uint32 LE PIR config: bit[5] filter (0=BPF,1=LPF), bits[10:9] window time = (v+1)*4 s,
//   bits[12:11] pulse threshold = v+1, bits[16:13] blind time = (v+1)*0.5 s, bits[24:17] detection threshold 0-255

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length === 0) return out;
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    hex += ('0' + bytes[i].toString(16)).slice(-2);
  }
  out.raw_uplink = hex.toUpperCase();
  if (fPort !== 102 || bytes.length < 8) return out;

  out.occupancy = (bytes[0] & 0x01) === 0x01;
  var battery = bytes[1] & 0x0f;
  out.battery_voltage = (25 + battery) / 10;
  out.battery_level = Math.round(battery * 1000 / 15) / 10;
  out.temperature = (bytes[2] & 0x7f) - 32;
  out.time_since_last_trigger = (bytes[4] << 8) | bytes[3];
  out.event_count = (bytes[7] << 16) | (bytes[6] << 8) | bytes[5];
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
