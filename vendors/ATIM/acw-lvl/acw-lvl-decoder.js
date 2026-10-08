// Source: ATIM ACW-LVL User Guide EN V2.0, chapter "Frame format" (new generation ACW frames)
// https://www.atim.com/wp-content/uploads/documentation/ACW/ACW-LVL/ENGLISH/ATIM_ACW-LVL_UG_EN.pdf
// Cleanroom implementation: frame layout derived solely from the vendor user guide PDF.

function _hex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16)).slice(-2);
  return s.toUpperCase();
}
function _u16(b, o) { return (b[o] << 8) | b[o + 1]; }
function _u32(b, o) { return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0; }

var ALERT_TYPES = ['back_to_normal', 'high_threshold', 'low_threshold'];

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || !bytes.length) return out;
  out.raw_uplink = _hex(bytes);
  var h = bytes[0];
  if (!(h & 0x80)) return out; // legacy (pre new-generation) frames are not described by the guide
  var i = 1;
  if (h & 0x40 && bytes.length >= 5) { out.timestamp = _u32(bytes, 1); i = 5; }
  if (h & 0x20) {
    // measurement frame: history depth and sample count encoded in the header
    var hist = ((h >> 3) & 0x03) + 1;
    var samples = (h & 0x07) + 1;
    if ((samples > 1 || hist > 1) && i + 2 <= bytes.length) {
      out.transmit_period_min = _u16(bytes, i);
      i += 2;
    }
    while (i < bytes.length) {
      var chh = bytes[i++];
      var mt = chh & 0x07;
      if (mt !== 0x07) break; // ACW-LVL only reports measurement type 0x07 (distance)
      var total = samples * hist;
      for (var s = 1; s <= total && i + 2 <= bytes.length; s++, i += 2) {
        if (s === 1) out.distance_mm = _u16(bytes, i);
        else out['distance_mm_' + s] = _u16(bytes, i);
      }
    }
  } else {
    switch (h & 0x0f) {
      case 0x01: // keep alive: idle battery level + on-load battery level (mV, MSB first)
        if (i + 4 <= bytes.length) {
          out.battery_idle_mv = _u16(bytes, i);
          out.battery_load_mv = _u16(bytes, i + 2);
        }
        break;
      case 0x02: // downlink request for network testing, no data
        break;
      case 0x05: // test frame with counter
        if (i < bytes.length) out.test_counter = bytes[i];
        break;
      case 0x0d: // alert measurement frame (threshold crossing or back to normal)
        while (i + 1 < bytes.length) {
          var ah = bytes[i++];
          var at = (ah >> 6) & 0x03;
          out.alert_channel = (ah >> 3) & 0x07;
          out.alert_type = ALERT_TYPES[at] || 'reserved';
          if (i + 2 <= bytes.length) {
            out.alert_distance_mm = _u16(bytes, i);
            i += 2;
          }
        }
        break;
      case 0x0e: // error frame: per-message header (index << 4 | length), first payload byte = error code
        while (i < bytes.length) {
          var eh = bytes[i++];
          var len = eh & 0x0f;
          if (len === 0 || i >= bytes.length) break;
          var code = bytes[i];
          out.error_code = '0x' + ('0' + code.toString(16)).slice(-2).toUpperCase();
          if ((code === 0x8a || code === 0x95) && i + 3 <= bytes.length) {
            out.error_battery_mv = _u16(bytes, i + 1);
          }
          i += len;
        }
        break;
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
