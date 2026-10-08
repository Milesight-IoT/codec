// Source: Decentlab DL-PM datasheet (Particulate Matter / Temperature / Humidity / Barometric Pressure Sensor for LoRaWAN)
// https://www.decentlab.com/products/particulate-matter-temperature-humidity-and-barometric-pressure-sensor-for-lorawan
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
    if (bytes.length < i + 2) return out;
    out.battery_voltage = _u16(bytes, i) / 1000;
    i += 2;
  }
  if (flags & 0x0002) {
    if (bytes.length < i + 20) return out;
    out.pm1_0_mass_concentration = _u16(bytes, i) / 10;
    out.pm2_5_mass_concentration = _u16(bytes, i + 2) / 10;
    out.pm4_mass_concentration = _u16(bytes, i + 4) / 10;
    out.pm10_mass_concentration = _u16(bytes, i + 6) / 10;
    out.typical_particle_size = _u16(bytes, i + 8);
    out.pm0_5_number_concentration = _u16(bytes, i + 10) / 10;
    out.pm1_0_number_concentration = _u16(bytes, i + 12) / 10;
    out.pm2_5_number_concentration = _u16(bytes, i + 14) / 10;
    out.pm4_number_concentration = _u16(bytes, i + 16) / 10;
    out.pm10_number_concentration = _u16(bytes, i + 18) / 10;
    i += 20;
  }
  if (flags & 0x0004) {
    if (bytes.length < i + 4) return out;
    out.air_temperature = _u16(bytes, i) / 65536 * 175.72 - 46.85;
    out.air_humidity = _u16(bytes, i + 2) / 65536 * 125 - 6;
    i += 4;
  }
  if (flags & 0x0008) {
    if (bytes.length < i + 2) return out;
    out.barometric_pressure = _u16(bytes, i) * 2;
    i += 2;
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes) }; }
function Decode(fPort, bytes) { return _decode(bytes); }
function Decoder(bytes, port) { return _decode(bytes); }
