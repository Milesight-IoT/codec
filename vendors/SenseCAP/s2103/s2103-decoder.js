// Source: SenseCAP S210X LoRaWAN Sensor User Guide (Seeed Studio), section 9
// "Packet Parsing" / "Data Parsing Example" - frame layout and sample values
// independently reimplemented from the manual tables only.
// Frame: [1B channel][2B measurement id LE][4B value LE] ... [2B CRC]
// Value = signed int32 (little-endian) / 1000.
// Battery segment starts with channel 0x00:
//   00 0700 <battery% LE16> 0500 (upload interval = LE16 of the 0x0005 id itself)

function _hex(bytes) {
  var out = '';
  for (var i = 0; i < bytes.length; i++) {
    out += ('0' + bytes[i].toString(16).toUpperCase()).slice(-2);
  }
  return out;
}

function _apply(out, id, value) {
  if (id === 4100) out.co2 = value;
  else if (id === 4097) out.air_temperature = value;
  else if (id === 4098) out.air_humidity = value;
}

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 2) return out;
  out.raw_uplink = _hex(bytes);
  var end = bytes.length - 2; // trailing CRC-16, not parsed
  var i = 0;
  while (i < end) {
    var ch = bytes[i];
    if (ch === 0x00 && i + 2 < end) {
      var sid = bytes[i + 1] | (bytes[i + 2] << 8);
      if (sid === 0x0007 && i + 4 < bytes.length) {
        out.battery = bytes[i + 3] | (bytes[i + 4] << 8);
        i += 5;
        // manual 9.4: trailing 0500 segment, its LE16 value is the interval
        if (i + 1 < end) {
          var iid = bytes[i] | (bytes[i + 1] << 8);
          if (iid === 0x0005) {
            out.upload_interval = iid;
            i += 2;
          }
        }
      } else {
        break;
      }
    } else if (i + 6 < end) {
      var mid = bytes[i + 1] | (bytes[i + 2] << 8);
      var raw = (bytes[i + 3] | (bytes[i + 4] << 8) | (bytes[i + 5] << 16) | (bytes[i + 6] << 24));
      if (raw & 0x80000000) raw -= 0x100000000;
      _apply(out, mid, raw / 1000);
      i += 7;
    } else {
      break;
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
