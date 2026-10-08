// Source: Decentlab DL-ITST datasheet (Infrared Thermometer Surface Temperature Sensor for LoRaWAN)
// https://www.decentlab.com/products/infrared-thermometer-surface-temperature-sensor-for-lorawan
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
    out.temperature_of_target = (_u16(bytes, i) - 1000) / 10;
    out.temperature_of_sensor_head = (_u16(bytes, i + 2) - 1000) / 10;
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
