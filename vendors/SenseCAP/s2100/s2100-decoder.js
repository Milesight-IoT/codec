// Source: SenseCAP S2100 LoRaWAN Data Logger User Guide (Seeed Studio), section 10
// "Packet Parsing" / "Data Parsing Example" - frame layout and sample values
// independently reimplemented from the manual tables only.
// The data logger transparently forwards configured sensor channels; byte 2 of a
// measurement frame is a nibble pair (m,n) of measurement numbers 1..10 as used
// in the manual examples. Values are big-endian uint32 / 1000; 0x80000000 = none.
// Packets: 0x31 two measurements; 0x30/0x32/0x33 first/middle/final fragment when
// more than two measurements (2 per fragment); 0x39 battery/version/interval.

function _hex(bytes) {
  var out = '';
  for (var i = 0; i < bytes.length; i++) {
    out += ('0' + bytes[i].toString(16).toUpperCase()).slice(-2);
  }
  return out;
}

// measurement number -> field, default channel meanings from manual examples
// 1=air temp, 2=air humidity, 3=barometric pressure, 4=light, 5=wind dir, 6=wind spd
function _apply(out, num, value) {
  if (num === 1) out.air_temperature = value;
  else if (num === 2) out.air_humidity = value;
  else if (num === 3) out.barometric_pressure = value;
  else if (num === 4) out.light_intensity = value;
  else if (num === 5) out.wind_direction = value;
  else if (num === 6) out.wind_speed = value;
  else out['measurement_' + num] = value;
}

function _be32(b, o) {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 2) return out;
  out.raw_uplink = _hex(bytes);
  var i = 0;
  while (i < bytes.length) {
    var pid = bytes[i];
    if ((pid === 0x30 || pid === 0x31 || pid === 0x32 || pid === 0x33) && i + 10 < bytes.length) {
      var pair = bytes[i + 1];
      var slots = [(pair >> 4) & 0x0F, pair & 0x0F];
      for (var s = 0; s < 2; s++) {
        if (slots[s] === 0) continue; // empty nibble
        var raw = _be32(bytes, i + 3 + s * 4);
        if (raw === 0x80000000) continue; // no measurement
        _apply(out, slots[s], raw / 1000);
      }
      i += 11;
    } else if (pid === 0x39 && i + 9 < bytes.length) {
      out.battery = bytes[i + 1];
      out.software_version = bytes[i + 2] + '.' + bytes[i + 3];
      out.hardware_version = bytes[i + 4] + '.' + bytes[i + 5];
      out.upload_interval = (bytes[i + 6] << 8) | bytes[i + 7];
      i += 10;
    } else {
      break;
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
