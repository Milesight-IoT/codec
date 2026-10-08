// Source: ATIM ACW-THAQ documentation (ATIM_ACW-THAQ_UG_EN_V1.10), uplink frame format chapter
// https://atim.com/wp-content/uploads/documentation/ACW/ACW-THAQ/ENGLISH/ATIM_ACW-THAQ_UG_EN.pdf
// ACW new-generation uplink frames. Header byte 1: bit7=1 (new generation), bit6=timestamp
// present, bit5=measurement frame, bit4-3=history depth-1 and bit2-0=samples-1 (measurement
// frame) or bit4=0 and bit3-0=frame type (classic frame: 0x01 life, 0x05 test, 0x0d alert,
// 0x0e error, ...). Channel header: bit5-4=lane, bit3-0=measurement type. Alert channel
// header: bit7-6=alert type, bit5-4=lane, bit3-0=type. Samples are Big Endian, newest first.

var _PERIOD_LITTLE_ENDIAN = false;
var _CHANNEL_FIELDS = {
  '0.8': 'temperature',
  '0.9': 'humidity',
  '0.12': 'voc_index',
  '0.13': 'co2'
};

var _ERROR_CODES = { 0x81: 'ERR_UNKNOWN', 0x82: 'ERR_BUF_SMALLER', 0x83: 'ERR_DEPTH_HISTORIC_OUT_OF_RANGE', 0x84: 'ERR_NB_SAMPLE_OUT_OF_RANGE', 0x85: 'ERR_NWAY_OUT_OF_RANGE', 0x86: 'ERR_TYPEWAY_OUT_OF_RANGE', 0x87: 'ERR_SAMPLING_PERIOD', 0x88: 'ERR_SUBTASK_END', 0x89: 'ERR_NULL_POINTER', 0x8A: 'ERR_BATTERY_LEVEL_DEAD', 0x8B: 'ERR_EEPROM', 0x8C: 'ERR_ROM', 0x8D: 'ERR_RAM', 0x8E: 'ERR_ARM_INIT_FAIL', 0x8F: 'ERR_ARM_BUSY', 0x90: 'ERR_ARM_BRIDGE_ENABLE', 0x91: 'ERR_RADIO_QUEUE_FULL', 0x92: 'ERR_CFG_BOX_INIT_FAIL', 0x93: 'ERR_KEEP_ALIVE_PERIOD', 0x94: 'ERR_ENTER_DEEP_SLEEP', 0x95: 'ERR_BATTERY_LEVEL_LOW', 0x96: 'ERR_ARM_TRANSMISSION', 0x97: 'ERR_ARM_PAYLOAD_BIGGER', 0x98: 'ERR_RADIO_PAIRING_TIMEOUT', 0x99: 'ERR_SENSORS_TIMEOUT' };

var _ALERT_TYPES = ['return_between_thresholds', 'high_threshold_exceeded', 'low_threshold_exceeded', 'reserved'];

function _be16(b, i) {
  var v = (b[i] << 8) | b[i + 1];
  return v >= 0x8000 ? v - 0x10000 : v;
}
function _ube16(b, i) { return (b[i] << 8) | b[i + 1]; }
function _ube32(b, i) { return ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0; }

function _sampleSize(type) {
  if (type === 0x01) return 1;
  if (type === 0x04) return 4;
  if (type === 0x08 || type === 0x09 || type === 0x0c || type === 0x0d) return 2;
  return 0;
}

function _emitSample(out, lane, type, b, i) {
  var field = _CHANNEL_FIELDS[lane + '.' + type];
  if (!field) return;
  if (type === 0x08 || type === 0x09) {
    var v = _be16(b, i);
    if (v === -32768) return; // 0x8000 = measurement error per manual
    out[field] = v / 100;
  } else if (type === 0x0c || type === 0x0d) {
    out[field] = _ube16(b, i);
  } else if (type === 0x04) {
    out[field] = _ube32(b, i);
  } else if (type === 0x01) {
    out[field] = b[i];
  }
}

function _decode(bytes) {
  var out = {};
  if (!bytes || bytes.length < 1) return out;
  var hex = [];
  for (var k = 0; k < bytes.length; k++) hex.push((bytes[k] < 16 ? '0' : '') + bytes[k].toString(16).toUpperCase());
  out.raw_uplink = hex.join('');

  var h = bytes[0];
  if (((h >> 7) & 1) !== 1) {
    out.frame_type = 'legacy';
    return out;
  }
  var i = 1;
  if (((h >> 6) & 1) === 1 && bytes.length >= i + 4) {
    out.timestamp = _ube32(bytes, i);
    i += 4;
  }

  if (((h >> 5) & 1) === 1) {
    out.frame_type = 'measurement';
    var depth = ((h >> 3) & 0x03) + 1;
    var samples = (h & 0x07) + 1;
    if ((depth > 1 || samples > 1) && bytes.length >= i + 2) {
      out.transmission_period_min = _PERIOD_LITTLE_ENDIAN ? (bytes[i] | (bytes[i + 1] << 8)) : _ube16(bytes, i);
      i += 2;
    }
    while (i < bytes.length) {
      var ch = bytes[i]; i++;
      var lane = (ch >> 4) & 0x03;
      var type = ch & 0x0F;
      var size = _sampleSize(type);
      var block = size * samples * depth;
      if (size === 0 || i + block > bytes.length) break;
      _emitSample(out, lane, type, bytes, i); // newest sample first
      i += block;
    }
    return out;
  }

  var ftype = h & 0x0F;
  if (ftype === 0x01) {
    out.frame_type = 'life';
    if (bytes.length >= i + 4) {
      out.battery_no_load_v = _ube16(bytes, i) / 1000;
      out.battery_load_v = _ube16(bytes, i + 2) / 1000;
    }
  } else if (ftype === 0x02) {
    out.frame_type = 'network_test';
  } else if (ftype === 0x05) {
    out.frame_type = 'test';
    if (i < bytes.length) out.test_counter = bytes[i];
  } else if (ftype === 0x0d) {
    out.frame_type = 'alert';
    while (i < bytes.length) {
      var ah = bytes[i]; i++;
      var alertType = (ah >> 6) & 0x03;
      var alane = (ah >> 4) & 0x03;
      var atype = ah & 0x0F;
      var asize = _sampleSize(atype);
      if (asize === 0 || i + asize > bytes.length) break;
      out.alert_type = _ALERT_TYPES[alertType];
      _emitSample(out, alane, atype, bytes, i);
      i += asize;
    }
  } else if (ftype === 0x0e) {
    out.frame_type = 'error';
    if (i < bytes.length) {
      var mh = bytes[i]; i++;
      var len = mh & 0x0F;
      if (len >= 1 && i + len <= bytes.length) {
        out.error_code = bytes[i];
        out.error_message = _ERROR_CODES[bytes[i]] || 'ERR_UNKNOWN';
        i += len;
      }
    }
  } else if (ftype === 0x06 || ftype === 0x07 || ftype === 0x08) {
    out.frame_type = 'config_response';
  } else if (ftype === 0x0f) {
    out.frame_type = 'subframe';
  } else {
    out.frame_type = 'unknown';
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input && input.bytes) }; }
function Decode(fPort, bytes) { return _decode(bytes); }
function Decoder(bytes, port) { return _decode(bytes); }
