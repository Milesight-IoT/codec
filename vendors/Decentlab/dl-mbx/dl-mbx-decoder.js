// Source: Decentlab DL-MBX datasheet (Ultrasonic Distance / Level Sensor for LoRaWAN)
// https://www.decentlab.com/products/ultrasonic-distance-/-level-sensor-for-lorawan
// Frame: protocol_version(u8) + device_id(u16) + flags(u16) + sensor blocks (uint16, big endian)

function _u16(bytes, i) {
  return (bytes[i] << 8) | bytes[i + 1];
}

function _decode(bytes) {
  var out = {};
  if (!bytes || bytes.length < 5) return out;
  var hex = '';
  for (var i = 0; i < bytes.length; i++) hex += ('0' + bytes[i].toString(16)).slice(-2);
  out.raw_uplink = hex.toUpperCase();
  out.protocol_version = bytes[0];
  out.device_id = _u16(bytes, 1);
  var flags = _u16(bytes, 3);
  var i = 5;
  if (flags & 0x0001) {
    if (bytes.length < i + 4) return out;
    out.distance = _u16(bytes, i);
    out.number_of_valid_samples = _u16(bytes, i + 2);
    i += 4;
  }
  if (flags & 0x0002) {
    if (bytes.length < i + 2) return out;
    out.battery_voltage = _u16(bytes, i) / 1000;
    i += 2;
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes) }; }
function Decode(fPort, bytes) { return _decode(bytes); }
function Decoder(bytes, port) { return _decode(bytes); }
