// Source: Decentlab DL-IFD (fruit diameter sensor for LoRaWAN) payload
// format specification — discontinued/custom model, functional spec
// extracted from the vendor's official format documentation (2026-10),
// manuals/Decentlab/dl-blocked21-specification.md, "dl-ifd" section.
// Cleanroom implementation: frame layout and conversions derived solely
// from that functional specification.
//
// Frame: version(1B, =2) + device_id(2B) + flags(2B), big endian, then one
// uint16 block per flag bit set (bit n == 1 -> sensor n data included).
// Sensor 0: fruit size = x / 100 [mm]
// Sensor 1: battery voltage = x / 1000 [V]

function _hex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16)).slice(-2);
  return s.toUpperCase();
}

function _u16(b, o) { return (b[o] << 8) | b[o + 1]; }

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 5) return out;
  out.raw_uplink = _hex(bytes);
  out.protocol_version = bytes[0];
  out.device_id = _u16(bytes, 1);
  var flags = _u16(bytes, 3);
  var o = 5;
  if ((flags & 1) && o + 2 <= bytes.length) {
    out.fruit_size = _u16(bytes, o) / 100;
    o += 2;
  }
  if ((flags & 2) && o + 2 <= bytes.length) {
    out.battery_voltage = _u16(bytes, o) / 1000;
    o += 2;
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
