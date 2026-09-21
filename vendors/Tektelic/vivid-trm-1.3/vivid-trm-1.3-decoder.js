function toSigned(raw, bits) {
  var signBit = 1 << (bits - 1);
  if (raw & signBit) {
    return raw - (1 << bits);
  }
  return raw;
}

function enumValue(byte, entries) {
  var key = '0x' + ('0' + byte.toString(16).toUpperCase()).slice(-2);
  if (entries.hasOwnProperty(key)) {
    return key + ' ' + entries[key];
  }
  return key;
}

function crc32(bytes) {
  var crc = 0xFFFFFFFF;
  for (var i = 0; i < bytes.length; i++) {
    crc = crc ^ bytes[i];
    for (var j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xEDB88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

var REGISTER_SIZES = {
  0x10: 2, 0x11: 2, 0x12: 2, 0x13: 5,
  0x20: 4, 0x21: 2, 0x22: 2, 0x23: 2, 0x24: 2, 0x25: 2, 0x26: 2, 0x27: 2, 0x28: 2, 0x29: 2,
  0x2A: 1, 0x2B: 2, 0x2C: 1,
  0x2D: 1, 0x2E: 2, 0x2F: 1,
  0x30: 2, 0x31: 2, 0x32: 1, 0x33: 2, 0x34: 2, 0x35: 2, 0x36: 2, 0x37: 2, 0x38: 2,
  0x39: 4, 0x3A: 4, 0x3B: 2, 0x3C: 1, 0x3D: 2, 0x3E: 1, 0x3F: 2, 0x40: 1,
  0x41: 4, 0x42: 4, 0x43: 2, 0x44: 1,
  0x47: 4, 0x48: 2, 0x49: 1,
  0x50: 2, 0x51: 2, 0x52: 2, 0x53: 2, 0x54: 2,
  0x5A: 1, 0x5B: 1, 0x5C: 1, 0x5D: 1,
  0x70: 2, 0x71: 7, 0x72: 1
};

function hex2(n) {
  return ('0' + n.toString(16).toUpperCase()).slice(-2);
}

function parseRegisters(bytes, start, out) {
  var i = start;
  while (i < bytes.length) {
    var addr = bytes[i];
    if (!REGISTER_SIZES.hasOwnProperty(addr)) {
      return false;
    }
    var size = REGISTER_SIZES[addr];
    if (i + 1 + size > bytes.length) {
      return false;
    }
    var value = [];
    for (var k = 0; k < size; k++) {
      value.push(bytes[i + 1 + k]);
    }
    out.registers['0x' + hex2(addr)] = value;
    i = i + 1 + size;
  }
  return true;
}

function decodeTransducer(bytes) {
  var data = {};
  var i = 0;
  while (i < bytes.length) {
    if (i + 2 > bytes.length) {
      break;
    }
    var channel = bytes[i];
    var type = bytes[i + 1];
    var start = i;
    if (channel === 0x00 && type === 0xFF && i + 4 <= bytes.length) {
      data.battery_voltage = toSigned((bytes[i + 2] << 8) | bytes[i + 3], 16) * 0.01;
      i += 4;
    } else if (channel === 0x01 && type === 0x00 && i + 3 <= bytes.length) {
      data.reed_state = enumValue(bytes[i + 2], {
        '0x00': 'magnet present (low)',
        '0xFF': 'magnet absent (high)'
      });
      i += 3;
    } else if (channel === 0x08 && type === 0x04 && i + 4 <= bytes.length) {
      data.reed_count = ((bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
      i += 4;
    } else if (channel === 0x0C && type === 0x00 && i + 3 <= bytes.length) {
      data.impact_alarm = enumValue(bytes[i + 2], {
        '0x00': 'inactive',
        '0xFF': 'active'
      });
      i += 3;
    } else if (channel === 0x05 && type === 0x02 && i + 4 <= bytes.length) {
      data.impact_magnitude = (((bytes[i + 2] << 8) | bytes[i + 3]) >>> 0) * 0.001;
      i += 4;
    } else if (channel === 0x07 && type === 0x71 && i + 8 <= bytes.length) {
      data.acceleration_xaxis = toSigned((bytes[i + 2] << 8) | bytes[i + 3], 16) * 0.001;
      data.acceleration_yaxis = toSigned((bytes[i + 4] << 8) | bytes[i + 5], 16) * 0.001;
      data.acceleration_zaxis = toSigned((bytes[i + 6] << 8) | bytes[i + 7], 16) * 0.001;
      i += 8;
    } else if (channel === 0x0E && type === 0x00 && i + 3 <= bytes.length) {
      data.extconnector_state = enumValue(bytes[i + 2], {
        '0x00': 'connector short-circuited (low)',
        '0xFF': 'connector open-circuited (high)'
      });
      i += 3;
    } else if (channel === 0x0F && type === 0x04 && i + 4 <= bytes.length) {
      data.extconnector_count = ((bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
      i += 4;
    } else if (channel === 0x11 && type === 0x02 && i + 4 <= bytes.length) {
      data.extconnector_analog = toSigned((bytes[i + 2] << 8) | bytes[i + 3], 16) * 0.001;
      i += 4;
    } else if (channel === 0x0B && type === 0x67 && i + 4 <= bytes.length) {
      data.mcu_temperature = toSigned((bytes[i + 2] << 8) | bytes[i + 3], 16) * 0.1;
      i += 4;
    } else if (channel === 0x03 && type === 0x67 && i + 4 <= bytes.length) {
      data.ambient_temperature = toSigned((bytes[i + 2] << 8) | bytes[i + 3], 16) * 0.1;
      i += 4;
    } else if (channel === 0x04 && type === 0x68 && i + 3 <= bytes.length) {
      data.relative_humidity = bytes[i + 2] * 0.5;
      i += 3;
    } else if (channel === 0x02 && type === 0x00 && i + 3 <= bytes.length) {
      data.light_detected = enumValue(bytes[i + 2], {
        '0x00': 'dark',
        '0xFF': 'bright'
      });
      i += 3;
    } else if (channel === 0x10 && type === 0x02 && i + 3 <= bytes.length) {
      data.light_intensity = bytes[i + 2];
      i += 3;
    } else if (channel === 0x0A && type === 0x00 && i + 3 <= bytes.length) {
      data.motion_event_state = enumValue(bytes[i + 2], {
        '0x00': 'no motion',
        '0xFF': 'motion detected'
      });
      i += 3;
    } else if (channel === 0x0D && type === 0x04 && i + 4 <= bytes.length) {
      data.motion_event_count = ((bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
      i += 4;
    } else if (channel === 0x09 && type === 0x00 && i + 3 <= bytes.length) {
      data.moisture = enumValue(bytes[i + 2], {
        '0x00': 'dry',
        '0xFF': 'wet'
      });
      i += 3;
    }
    if (i === start) {
      break;
    }
  }
  return data;
}

function decodeConfigResponse(bytes) {
  var data = { registers: {} };
  if (!parseRegisters(bytes, 0, data) && bytes.length >= 5) {
    data.dl_payload_crc32 = (((bytes[0] << 24) >>> 0) + (bytes[1] << 16) + (bytes[2] << 8) + bytes[3]) >>> 0;
    data.registers = {};
    if (!parseRegisters(bytes, 4, data)) {
      data.registers = {};
      data.parse_error = true;
    }
  } else if (!parseRegisters(bytes, 0, data)) {
    data.registers = {};
    data.parse_error = true;
  }
  var regHex = {};
  var addr;
  for (addr in data.registers) {
    if (data.registers.hasOwnProperty(addr)) {
      var valBytes = data.registers[addr];
      var s = '';
      for (var k = 0; k < valBytes.length; k++) {
        s += hex2(valBytes[k]);
      }
      regHex[addr] = s;
    }
  }
  data.registers = regHex;
  return data;
}

function decodeUplink(input) {
  var bytes = input.bytes || input;
  var fPort = input.fPort;
  if (fPort === undefined || fPort === null) {
    fPort = 10;
  }
  var bytesArr = [];
  for (var i = 0; i < bytes.length; i++) {
    bytesArr.push(bytes[i] & 0xFF);
  }
  if (fPort === 100) {
    return { data: decodeConfigResponse(bytesArr) };
  }
  if (fPort === 10) {
    return { data: decodeTransducer(bytesArr) };
  }
  return { data: {} };
}

function decodeDownlink(input) {
  var bytes = input.bytes || input;
  var hex = [];
  for (var i = 0; i < bytes.length; i++) {
    hex.push(('0' + (bytes[i] & 0xFF).toString(16).toUpperCase()).slice(-2));
  }
  return { fPort: input.fPort !== undefined ? input.fPort : 100, bytes: hex.join('') };
}

function encodeDownlink(input) {
  var hexStr = input.bytes || input.data || '';
  var clean = String(hexStr).replace(/[^0-9a-fA-F]/g, '');
  if (clean.length % 2 !== 0) {
    clean = '0' + clean;
  }
  var bytes = [];
  for (var i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.substr(i, 2), 16));
  }
  return { fPort: input.fPort !== undefined ? input.fPort : 100, bytes: bytes };
}

function Decode(fPort, bytes) {
  return decodeUplink({ fPort: fPort, bytes: bytes }).data;
}

function Decoder(bytes, fPort) {
  return decodeUplink({ fPort: fPort, bytes: bytes }).data;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    decodeUplink: decodeUplink,
    decodeDownlink: decodeDownlink,
    encodeDownlink: encodeDownlink,
    Decode: Decode,
    Decoder: Decoder
  };
}
