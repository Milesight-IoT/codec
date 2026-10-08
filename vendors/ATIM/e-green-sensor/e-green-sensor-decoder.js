// Source: TCT E green Sensor user guide (TCT_Egreen_Sensor_Manual V1.2), self-powered
// current sensor distributed with ATIM ACW (listed as atim E-GREEN-SENSOR)
// https://www.tct.fr/uploads/kcfinder/files/E%20green%20Sensor%20user%20guide(1).pdf
// New-generation ACW frame architecture:
//   header bit7=1 | bit6 timestamp (4 bytes follow) | bit5 measurement frame
//   measurement frames: bits4-3 history-1, bits2-0 samples-1; a 2-byte big-endian
//   emission period in minutes follows the header when history or samples > 1
//   classic frames: bits3-0 type: 0x01 life | 0x05 test | 0x06 config ack | 0x0d alert | 0x0e error
//   channel header: bits7-6 alert type (00 return / 01 high / 10 low threshold), bits5-4 channel,
//   bits3-0 measurement type: 0x08 temperature (2B BE signed, 0.01 degC)
//                          | 0x0A supercap voltage (2B BE, mV) | 0x0B current (2B BE, 0.01 A)
//   life frame: no-load voltage mV (BE) + on-load voltage mV (BE) across the supercap
//   measurement samples are 2 bytes big-endian, newest first; only the newest sample of
//   each channel is decoded, older history samples are skipped

function _u16be(b, i) { return (b[i] << 8) | b[i + 1]; }

function _decode(bytes, fPort) {
  var out = { raw_uplink: '' };
  if (!bytes || !bytes.length) return out;
  for (var i = 0; i < bytes.length; i++) {
    out.raw_uplink += ('0' + bytes[i].toString(16).toUpperCase()).slice(-2);
  }
  var b0 = bytes[0];
  if ((b0 & 0x80) !== 0x80) return out;
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
    while (i + 1 < bytes.length) {
      var chHdr = bytes[i];
      var mtype = chHdr & 0x0F;
      i++;
      if (mtype === 0x08) {
        var v = _u16be(bytes, i);
        if (v & 0x8000) v -= 0x10000; // signed hundredths of degrees
        out.temperature = Math.round(v) / 100;
      } else if (mtype === 0x0A) {
        out.supercap_voltage = _u16be(bytes, i) / 1000; // mV -> V
      } else if (mtype === 0x0B) {
        out.current = Math.round(_u16be(bytes, i)) / 100; // hundredths of amps -> A
      }
      i += 2 * samples * history; // skip older samples of this channel
    }
  } else {
    if (type === 0x01 && bytes.length >= i + 4) {
      out.frame_type = 'life';
      out.supercap_voltage_no_load = _u16be(bytes, i) / 1000;
      out.supercap_voltage_on_load = _u16be(bytes, i + 2) / 1000;
    } else if (type === 0x05) {
      out.frame_type = 'test';
    } else if (type === 0x06) {
      out.frame_type = 'ack';
    } else if (type === 0x0d && i + 2 < bytes.length) {
      out.frame_type = 'alert';
      var chHdr = bytes[i];
      var alertTypes = { 0: 'return_to_normal', 1: 'high_threshold', 2: 'low_threshold' };
      out.alert_type = alertTypes[(chHdr >> 6) & 0x03] || 'reserved';
      var mtype = chHdr & 0x0F;
      var v2 = _u16be(bytes, i + 1);
      if (mtype === 0x08) {
        if (v2 & 0x8000) v2 -= 0x10000;
        out.temperature = Math.round(v2) / 100;
      } else if (mtype === 0x0A) {
        out.supercap_voltage = v2 / 1000;
      } else if (mtype === 0x0B) {
        out.current = Math.round(v2) / 100;
      }
    } else if (type === 0x0e && bytes.length >= i + 2) {
      out.frame_type = 'error';
      var length = bytes[i] & 0x0F;
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
