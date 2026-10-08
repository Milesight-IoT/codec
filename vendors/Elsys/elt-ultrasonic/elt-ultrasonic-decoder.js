// Source (clean-room reimplementation, no vendor decoder code consulted):
//   - ELSYS sensor payload specification (TLV structure, data types table):
//     https://elsys.se/public/documents/Sensor_payload.pdf
//   - ELT Ultrasonic product page (internal sensors: temperature, humidity,
//     accelerometer, atmospheric pressure; ultrasonic range 300-5000 mm):
//     https://www.elsys.se/en/elt-ultrasonic/
//   - ELT series operating manual (internal sensor matrix incl. ultrasonic
//     5m Maxbotix MB7389, 30-500 cm, 1 mm resolution; I/O1 external channels):
//     https://elsys.se/public/manuals/New/Operating%20Manual%20ELT%20series%20LoRa.pdf
//
// Payload: TLV stream on the sensor data port. Each record is one type byte
// (bits 7-6: number of trailing offset bytes 0/1/2/4, bits 5-0: sensor type)
// followed by the fixed-length value bytes and the optional offset (seconds
// since sampling). The onboard ultrasonic distance is reported with the
// distance data type. Unknown or undefined-length types stop the parse.
function _int8(v) {
  return v < 128 ? v : v - 256;
}
function _int16(b, o) {
  var v = (b[o] << 8) | b[o + 1];
  return v < 0x8000 ? v : v - 0x10000;
}
function _uint16(b, o) {
  return (b[o] << 8) | b[o + 1];
}
function _uint32(b, o) {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}
function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || !bytes.length) return out;
  var LEN = {
    0x01: 2, 0x02: 1, 0x03: 3, 0x04: 2, 0x05: 1, 0x06: 2, 0x07: 2,
    0x08: 2, 0x09: 6, 0x0A: 2, 0x0B: 4, 0x0C: 2, 0x0D: 1, 0x0E: 2,
    0x0F: 1, 0x10: 4, 0x11: 1, 0x12: 1, 0x13: 65, 0x14: 4, 0x15: 2,
    0x16: 2, 0x17: 4, 0x18: 2, 0x19: 2, 0x1A: 1, 0x1B: 4, 0x3D: 4
  };
  var i = 0;
  while (i < bytes.length) {
    var typeByte = bytes[i];
    var nob = (typeByte >> 6) & 0x03;
    var stype = typeByte & 0x3F;
    var len = LEN[stype];
    // 0x00 reserved, 0x3E sensor settings (variable length, sent on port+1)
    // and anything outside the table cannot be skipped safely.
    if (len === undefined) break;
    if (i + 1 + len + nob > bytes.length) break;
    var b = bytes.slice(i + 1, i + 1 + len);
    switch (stype) {
      case 0x01:
        out.temperature = _int16(b, 0) / 10;
        break;
      case 0x02:
        out.humidity = b[0];
        break;
      case 0x03:
        out.acceleration_x = _int8(b[0]) / 63;
        out.acceleration_y = _int8(b[1]) / 63;
        out.acceleration_z = _int8(b[2]) / 63;
        break;
      case 0x07:
        // raw uint16, unit mV (Sensor_payload.pdf 0x07: 0-65535 mV)
        out.battery_voltage = _uint16(b, 0);
        break;
      case 0x08:
        // raw uint16, unit mV (Sensor_payload.pdf 0x03 Analog: 0-65535 mV)
        out.analog_input_1 = _uint16(b, 0);
        break;
      case 0x0A:
        out.pulse_count_1 = _uint16(b, 0);
        break;
      case 0x0B:
        out.pulse_count_1_absolute = _uint32(b, 0);
        break;
      case 0x0C:
        out.external_temperature_probe_1 = _int16(b, 0) / 10;
        break;
      case 0x0D:
        out.external_digital_input_1 = b[0] ? 1 : 0;
        break;
      case 0x0E:
        // external distance, unit mm (Sensor_payload.pdf 0x0E: 0-65535 mm);
        // on this device the onboard ultrasonic range is reported here
        out.external_distance = _uint16(b, 0);
        break;
      case 0x0F:
        // Acceleration events: nr of threshold-exceeding movements since
        // last transmission (AppNote type 0x0F, 0-255)
        out.acceleration_movements = b[0];
        break;
      case 0x10:
        // external IR temperature: 2 bytes sensor (internal) + 2 bytes target
        // (external), resolution 0.1 degC (Sensor_payload.pdf 0x10)
        out.ir_temperature_internal = _int16(b, 0) / 10;
        out.ir_temperature_external = _int16(b, 2) / 10;
        break;
      case 0x12:
        // Waterleak: events since last report (0-99), plus a +100 marker
        // while currently detecting water (AppNote: 101 = 1 event, detecting)
        out.waterleak_detected = b[0] >= 100;
        out.waterleak_events = b[0] % 100;
        break;
      case 0x14:
        // raw unit is 0.001 hPa, so hPa = raw / 1000 (Sensor_payload.pdf
        // 0x14 "Pressure data (hPa)"; standard atmosphere ~1013 hPa)
        out.atmospheric_pressure = _uint32(b, 0) / 1000;
        break;
      case 0x16:
        out.pulse_count_2 = _uint16(b, 0);
        break;
      case 0x17:
        out.pulse_count_2_absolute = _uint32(b, 0);
        break;
      case 0x18:
        // raw uint16, unit mV (Sensor_payload.pdf 0x18 Analog 2: 0-65535 mV)
        out.analog_input_2 = _uint16(b, 0);
        break;
      case 0x19:
        out.external_temperature_probe_2 = _int16(b, 0) / 10;
        break;
      case 0x1A:
        out.external_digital_input_2 = b[0] ? 1 : 0;
        break;
      default:
        break;
    }
    i += 1 + len + nob;
  }
  var hex = '';
  for (var j = 0; j < bytes.length; j++) {
    hex += ('0' + bytes[j].toString(16)).slice(-2);
  }
  out.raw_uplink = hex;
  return out;
}
function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
