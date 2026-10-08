// Source: ATIM ACW-WL(L) user guide (ATIM_ACW-WLL_UG_EN_V1.7), models ACW/SF8-WL-I,
// ACW/LW8-WL-I, ACW/SF8-WL-O, ACW/LW8-WL-O
// Distributed via ThingPark Market: https://market.thingpark.com/media/datasheet/a/t/atim_acw-wll_ug_en.pdf
// New-generation ACW frame architecture:
//   header bit7=1 | bit6 timestamp (4 bytes follow) | bit5 measurement frame
//   measurement frames: bits4-3 history-1, bits2-0 samples-1; a 2-byte big-endian
//   emission period in minutes follows the header when history or samples > 1
//   classic frames: bits3-0 type: 0x01 life | 0x05 test | 0x06 config ack | 0x0d alert | 0x0e error
//   life frame: no-load battery mV (BE) + on-load battery mV (BE)
//   test frame: 0x85 0x4A + 4-byte sensor value; alert frame: 0x8D + channel header + 4-byte sample
//   channel header: bits7-6 alert type (00 return to normal / 01 high threshold = leak /
//   10 low threshold), bits5-4 channel number, bits3-0 measurement type (0x0A sensor signal)
//   sensor signal samples are 4 bytes big-endian; units not specified in the guide (raw)

function _decode(bytes, fPort) {
  var out = { raw_uplink: '' };
  if (!bytes || !bytes.length) return out;
  for (var i = 0; i < bytes.length; i++) {
    out.raw_uplink += ('0' + bytes[i].toString(16).toUpperCase()).slice(-2);
  }
  var b0 = bytes[0];
  if ((b0 & 0x80) !== 0x80) return out; // only new-generation frames described in the UG
  var hasTs = (b0 & 0x40) !== 0;
  var isMeas = (b0 & 0x20) !== 0;
  var type = b0 & 0x0F;
  var i = 1;
  if (hasTs) {
    if (bytes.length < i + 4) return out;
    out.timestamp = ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
    i += 4;
  }
  if (isMeas) {
    var history = ((b0 >> 3) & 0x03) + 1;
    var samples = (b0 & 0x07) + 1;
    out.frame_type = 'measurement';
    if (history > 1 || samples > 1) {
      if (bytes.length < i + 2) return out;
      out.measurement_period_min = (bytes[i] << 8) | bytes[i + 1];
      i += 2;
    }
    while (i < bytes.length) {
      i++; // channel header: channel number bits5-4, measurement type bits3-0
      if (i + 4 > bytes.length) break;
      out.sensor_signal = ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
      i += 4 * samples * history; // only the newest sample of the channel is decoded
    }
  } else {
    if (type === 0x01 && bytes.length >= i + 4) {
      out.frame_type = 'life';
      out.battery_voltage_no_load = ((bytes[i] << 8) | bytes[i + 1]) / 1000;
      out.battery_voltage_on_load = ((bytes[i + 2] << 8) | bytes[i + 3]) / 1000;
    } else if (type === 0x05) {
      out.frame_type = 'test';
      if (i < bytes.length && bytes[i] === 0x4A) i++; // fixed sensor channel byte of the test frame
      if (i + 4 <= bytes.length) {
        out.sensor_signal = ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
      }
    } else if (type === 0x06) {
      out.frame_type = 'ack';
    } else if (type === 0x0d && i < bytes.length) {
      out.frame_type = 'alert';
      var alertTypes = { 0: 'return_to_normal', 1: 'high_threshold', 2: 'low_threshold' };
      var alertType = (bytes[i] >> 6) & 0x03;
      out.alert_type = alertTypes[alertType] || 'reserved';
      if (alertType === 1) out.leak_detected = 1; // high threshold exceeded = leak
      if (alertType === 0) out.leak_detected = 0; // back between thresholds = leak cleared
      i++;
      if (i + 4 <= bytes.length) {
        out.sensor_signal = ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
      }
    } else if (type === 0x0e && bytes.length >= i + 2) {
      out.frame_type = 'error';
      var length = bytes[i] & 0x0F; // error message length in bytes
      var codes = [];
      for (var k = 0; k < length && i + 1 + k < bytes.length; k++) {
        codes.push('0x' + ('0' + bytes[i + 1 + k].toString(16).toUpperCase()).slice(-2));
      }
      out.error_code = codes.join(',');
    } else {
      out.frame_type = 'unknown';
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input && input.bytes, input && input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
