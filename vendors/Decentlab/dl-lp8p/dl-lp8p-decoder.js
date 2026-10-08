// Source: Decentlab DL-LP8P datasheet (CO2 / Temperature / Humidity / Barometric Pressure Sensor for LoRaWAN)
// https://www.decentlab.com/products/co2-temperature-humidity-and-barometric-pressure-sensor-for-lorawan
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
    out.air_temperature = _u16(bytes, i) / 65536 * 175.72 - 46.85;
    out.air_humidity = _u16(bytes, i + 2) / 65536 * 125 - 6;
    i += 4;
  }
  if (flags & 0x0002) {
    if (bytes.length < i + 4) return out;
    out.barometer_temperature = (_u16(bytes, i) - 5000) / 100;
    out.barometric_pressure = _u16(bytes, i + 2) * 2;
    i += 4;
  }
  if (flags & 0x0004) {
    if (bytes.length < i + 16) return out;
    out.co2_concentration = _u16(bytes, i) - 32768;
    out.co2_concentration_lpf = _u16(bytes, i + 2) - 32768;
    out.co2_sensor_temperature = (_u16(bytes, i + 4) - 32768) / 100;
    out.capacitor_voltage_1 = _u16(bytes, i + 6) / 1000;
    out.capacitor_voltage_2 = _u16(bytes, i + 8) / 1000;
    out.co2_sensor_status = _u16(bytes, i + 10);
    out.raw_ir = _u16(bytes, i + 12);
    out.raw_ir_lpf = _u16(bytes, i + 14);
    i += 16;
  }
  if (flags & 0x0008) {
    if (bytes.length < i + 2) return out;
    out.battery_voltage = _u16(bytes, i) / 1000;
    i += 2;
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes) }; }
function Decode(fPort, bytes) { return _decode(bytes); }
function Decoder(bytes, port) { return _decode(bytes); }
