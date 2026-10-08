// Source: Elsys "Sensor payload" document (elsys.se/public/documents/Sensor_payload.pdf)
// section 1.2 "Sensor data" / 1.2.1.2 "STYPE"; ERS CO2 Lite LoRa product page https://www.elsys.se/en/ers-co2-lite/

// ELSYS payload is a TLV stream (fPort 5). Each item: 1 type byte + fixed-length data
// + optional offset. Type byte bits 7..6 = number of offset bytes (0/1/2/4), bits 5..0 = sensor type.

var TYPE_SIZES = {
  0x01: 2, 0x02: 1, 0x03: 3, 0x04: 2, 0x05: 1, 0x06: 2, 0x07: 2,
  0x08: 2, 0x09: 6, 0x0A: 2, 0x0B: 4, 0x0C: 2, 0x0D: 1, 0x0E: 2,
  0x0F: 1, 0x10: 4, 0x11: 1, 0x12: 1, 0x13: 65, 0x14: 4, 0x15: 2,
  0x16: 2, 0x17: 4, 0x18: 2, 0x19: 2, 0x1A: 1, 0x1B: 4, 0x3D: 4
};

function _int16(b, i) {
  var v = (b[i] << 8) | b[i + 1];
  return v >= 0x8000 ? v - 0x10000 : v;
}

function _uint16(b, i) {
  return (b[i] << 8) | b[i + 1];
}

// ERS CO2 Lite LoRa sensors: temperature, humidity, CO2. Battery is always reported.
function _readField(stype, b, i) {
  switch (stype) {
    case 0x01: return { name: 'temperature', value: _int16(b, i) / 10 };
    case 0x02: return { name: 'humidity', value: b[i] };
    case 0x06: return { name: 'co2', value: _uint16(b, i) };
    case 0x07: return { name: 'battery_voltage', value: _uint16(b, i) }; // raw mV (0x07: 0-65535 mV)
  }
  return null;
}

function _decode(bytes) {
  var out = {};
  if (!bytes || !bytes.length) return out;
  var hex = [];
  for (var n = 0; n < bytes.length; n++) {
    hex.push((bytes[n] < 16 ? '0' : '') + bytes[n].toString(16).toUpperCase());
  }
  out.raw_uplink = hex.join('');

  var counts = {};
  var i = 0;
  while (i < bytes.length) {
    var typeByte = bytes[i];
    var offsetLen = typeByte >> 6;
    if (offsetLen === 3) offsetLen = 4;
    var stype = typeByte & 0x3f;
    var size = TYPE_SIZES[stype];
    i += 1;
    if (size === undefined) break; // reserved / variable-length type: stop parsing
    if (i + size + offsetLen > bytes.length) break; // truncated item
    var field = _readField(stype, bytes, i);
    i += size;
    var offset = 0;
    for (var k = 0; k < offsetLen; k++) offset = (offset << 8) | bytes[i + k];
    i += offsetLen;
    if (!field) continue; // known type, not part of this model
    counts[field.name] = (counts[field.name] || 0) + 1;
    var key = counts[field.name] > 1 ? field.name + '_' + counts[field.name] : field.name;
    out[key] = field.value;
    if (offsetLen > 0) out[key + '_offset'] = offset;
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes) }; }
function Decode(fPort, bytes) { return _decode(bytes); }
function Decoder(bytes, port) { return _decode(bytes); }
