// Source: Elsys EMS Lite LoRa datasheet (2019) and ELSYS uplink payload description
// AppNote (2026-08-18), vendor-public documents only.
//   https://elsys.se/public/datasheets/EMS_lite_datasheet.pdf
//   https://elsys.se/public/app_notes/AppNote_ELSYS_uplink_payload.pdf
// Payload: TLV stream on fPort 5 (default). Each measurement = 1 type byte + fixed-length value.
// Type byte: low 6 bits = type (0-63), high 2 bits = trailing timestamp size (0/1/2/4 bytes).
// EMS Lite data types per datasheet: 0x01 temperature, 0x02 humidity, 0x07 VDD,
// 0x12 waterleak (count up to 99, +100 marker while detecting).

var LENGTHS = {
  0x01: 2, 0x02: 1, 0x03: 3, 0x04: 2, 0x05: 1, 0x06: 2, 0x07: 2, 0x08: 2,
  0x09: 6, 0x0A: 2, 0x0B: 4, 0x0C: 2, 0x0D: 1, 0x0E: 2, 0x0F: 1, 0x10: 4,
  0x11: 1, 0x12: 1, 0x13: 65, 0x14: 4, 0x15: 2, 0x16: 2, 0x17: 4, 0x18: 2,
  0x19: 2, 0x1A: 1, 0x1B: 4, 0x1C: 2, 0x1D: 1, 0x1E: 1, 0x1F: 1, 0x20: 2,
  0x21: 1, 0x22: 2, 0x23: 1, 0x24: 1, 0x3D: 4
};

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || !bytes.length) return out;
  var raw = [];
  for (var r = 0; r < bytes.length; r++) {
    var h = bytes[r].toString(16).toUpperCase();
    raw.push(h.length === 1 ? '0' + h : h);
  }
  out.raw_uplink = raw.join('');
  var i = 0;
  while (i < bytes.length) {
    var b = bytes[i];
    var type = b & 0x3F;
    var tsSize = (b >> 6) & 0x03;
    var len = LENGTHS[type];
    if (len === undefined) break; // 0x3E sensor settings (variable length) or unknown: stop
    if (i + 1 + len + tsSize > bytes.length) break; // truncated frame
    switch (type) {
      case 0x01: { // temperature, int16, 0.1 degC
        var t = (bytes[i + 1] << 8) | bytes[i + 2];
        if (t > 32767) t -= 65536;
        out.temperature = t / 10;
        break;
      }
      case 0x02: // humidity, 1 %
        out.humidity = bytes[i + 1];
        break;
      case 0x07: // internal battery voltage, mV
        out.battery_voltage = (bytes[i + 1] << 8) | bytes[i + 2];
        break;
      case 0x12: { // waterleak: event count (max 99) + 100 marker while detecting
        var w = bytes[i + 1];
        out.waterleak_detected = w >= 100;
        out.waterleak_events = w >= 100 ? w - 100 : w;
        break;
      }
      default:
        break; // type valid for other ELSYS devices: skip by table length
    }
    i += 1 + len + tsSize;
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
