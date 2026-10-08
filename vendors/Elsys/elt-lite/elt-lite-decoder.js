// Source (clean-room reimplementation, no vendor decoder code consulted):
//   - ELSYS sensor payload specification (TLV structure, data types table):
//     https://elsys.se/public/documents/Sensor_payload.pdf
//   - ELT Lite operating manual (single multi-purpose I/O, no internal sensors,
//     external channels: DS18B20, analog 0-3/0-10V, switch, pulse, 4-20mA,
//     water leak, Decagon meter):
//     https://elsys.se/public/manuals/Operating%20Manual%20ELT%20Lite.pdf
//   - ELT series operating manual (internal sensor matrix, ELT Lite column):
//     https://elsys.se/public/manuals/New/Operating%20Manual%20ELT%20series%20LoRa.pdf
//
// Payload: TLV stream on the sensor data port. Each record is one type byte
// (bits 7-6: number of trailing offset bytes 0/1/2/4, bits 5-0: sensor type)
// followed by the fixed-length value bytes and the optional offset (seconds
// since sampling). Unknown or undefined-length types stop the parse.
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
        // external distance sensor, unit mm (Sensor_payload.pdf 0x0E: 0-65535 mm)
        out.external_distance = _uint16(b, 0);
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
