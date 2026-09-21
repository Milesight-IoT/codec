var REGISTER_READ_SIZES = {
  0x10: 4, 0x11: 4, 0x12: 4, 0x13: 4,
  0x20: 2, 0x21: 1, 0x22: 1, 0x23: 2, 0x24: 2, 0x25: 1, 0x26: 2, 0x27: 2, 0x28: 2, 0x29: 2,
  0x2A: 1, 0x2B: 1, 0x2C: 1, 0x2D: 1, 0x2E: 1, 0x2F: 1, 0x5A: 1,
  0x30: 1, 0x31: 1, 0x32: 1, 0x33: 1, 0x34: 1, 0x35: 1, 0x36: 1, 0x37: 1,
  0x38: 2, 0x39: 2, 0x3A: 2, 0x3B: 2, 0x3C: 1, 0x3D: 2, 0x3E: 1, 0x3F: 1, 0x40: 1,
  0x41: 2, 0x42: 2, 0x43: 2, 0x44: 2, 0x45: 2, 0x46: 2,
  0x50: 1, 0x51: 1, 0x52: 1, 0x53: 1, 0x54: 1,
  0x6F: 1, 0x70: 1, 0x71: 1, 0x72: 1
};

function toInt16(raw) {
  return raw >= 0x8000 ? raw - 0x10000 : raw;
}

function toInt8(raw) {
  return raw >= 0x80 ? raw - 0x100 : raw;
}

function readU16(bytes, offset) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function parseS16(bytes, offset) {
  return toInt16(readU16(bytes, offset));
}

function parseResetDiagnostics(bytes) {
  var data = {};
  var reasonMap = {
    0x01: "Push-button reset",
    0x02: "DL command reset",
    0x04: "Independent watchdog reset",
    0x08: "Power loss reset"
  };
  var reason = bytes[2];
  if (reasonMap.hasOwnProperty(reason)) {
    data.reset_reason = reasonMap[reason];
  } else {
    data.reset_reason = "Unknown (0x" + reason.toString(16) + ")";
  }
  data.power_loss_reset_count = bytes[3];
  data.watchdog_reset_count = bytes[4];
  data.dl_reset_count = bytes[5];
  data.button_reset_count = bytes[6];
  return data;
}

function parseBinaryState(name, raw, data) {
  data[name] = raw === 0xFF ? 255 : raw;
}

var TRANSDUCER_TYPES = {
  0x00: { size: 1, kind: "state" },
  0x02: { size: 2, kind: "analog" },
  0x04: { size: 2, kind: "count" },
  0x67: { size: 2, kind: "temperature" },
  0x68: { size: 1, kind: "humidity" },
  0x71: { size: 6, kind: "acceleration" },
  0xBA: { size: 2, kind: "voltage" }
};

function parseTransducerBlock(channel, type, bytes, offset, data) {
  var consumed = 0;
  switch (channel) {
    case 0x00:
      if (type === 0xBA) {
        data.battery_voltage = readU16(bytes, offset) * 0.001;
        consumed = 2;
      }
      break;
    case 0x01:
      if (type === 0x00) {
        parseBinaryState("hall_effect_state", bytes[offset], data);
        consumed = 1;
      }
      break;
    case 0x02:
      if (type === 0x00) {
        parseBinaryState("light_detected", bytes[offset], data);
        consumed = 1;
      }
      break;
    case 0x03:
      if (type === 0x67) {
        data.ambient_temperature = parseS16(bytes, offset) / 10;
        consumed = 2;
      }
      break;
    case 0x04:
      if (type === 0x68) {
        data.relative_humidity = bytes[offset] * 0.5;
        consumed = 1;
      }
      break;
    case 0x05:
      if (type === 0x02) {
        data.impact_magnitude = readU16(bytes, offset) * 0.001;
        consumed = 2;
      }
      break;
    case 0x07:
      if (type === 0x71) {
        data.acceleration_xaxis = parseS16(bytes, offset) * 0.001;
        data.acceleration_yaxis = parseS16(bytes, offset + 2) * 0.001;
        data.acceleration_zaxis = parseS16(bytes, offset + 4) * 0.001;
        consumed = 6;
      }
      break;
    case 0x08:
      if (type === 0x04) {
        data.hall_effect_count = readU16(bytes, offset);
        consumed = 2;
      }
      break;
    case 0x0A:
    case 0x0D:
      if (type === 0x00) {
        parseBinaryState("motion_event_state", bytes[offset], data);
        consumed = 1;
      } else if (type === 0x04) {
        data.motion_event_count = readU16(bytes, offset);
        consumed = 2;
      }
      break;
    case 0x0B:
      if (type === 0x67) {
        data.mcu_temperature = parseS16(bytes, offset) / 10;
        consumed = 2;
      }
      break;
    case 0x0C:
      if (type === 0x00) {
        parseBinaryState("impact_alarm", bytes[offset], data);
        consumed = 1;
      }
      break;
    case 0x0E:
      if (type === 0x00) {
        parseBinaryState("extconnector_state", bytes[offset], data);
        consumed = 1;
      }
      break;
    case 0x0F:
      if (type === 0x04) {
        data.extconnector_count = readU16(bytes, offset);
        consumed = 2;
      }
      break;
    case 0x10:
      if (type === 0x02) {
        data.light_intensity = bytes[offset];
        consumed = 1;
      }
      break;
    case 0x11:
      if (type === 0x02) {
        data.extconnector_analog = parseS16(bytes, offset) * 0.001;
        consumed = 2;
      }
      break;
    case 0x12:
      if (type === 0x04) {
        data.extconnector_total_count =
          (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
        if (data.extconnector_total_count < 0) {
          data.extconnector_total_count += 0x100000000;
        }
        consumed = 4;
      }
      break;
    default:
      consumed = 0;
      break;
  }
  if (consumed === 0 && TRANSDUCER_TYPES.hasOwnProperty(type)) {
    consumed = TRANSDUCER_TYPES[type].size;
  }
  return consumed;
}

function parseTransducerData(bytes) {
  var data = {};
  var offset = 0;
  while (offset + 2 <= bytes.length) {
    var channel = bytes[offset];
    var type = bytes[offset + 1];
    var consumed = parseTransducerBlock(channel, type, bytes, offset + 2, data);
    offset += 2 + consumed;
    if (consumed === 0) {
      offset = bytes.length;
    }
  }
  return data;
}

function parseReadResponse(bytes) {
  var data = {};
  var pairs = [];
  var offset = 0;
  while (offset < bytes.length) {
    var address = bytes[offset];
    var size = REGISTER_READ_SIZES.hasOwnProperty(address) ? REGISTER_READ_SIZES[address] : 1;
    var value = 0;
    var i;
    for (i = 0; i < size && offset + 1 + i < bytes.length; i++) {
      value = (value << 8) | bytes[offset + 1 + i];
    }
    pairs.push({ address: address, value: value });
    offset += 1 + size;
  }
  data.register_read_response = pairs;
  return data;
}

function parseWriteResponse(bytes) {
  var data = {};
  if (bytes.length === 4) {
    var crc = "";
    var i;
    for (i = 0; i < 4; i++) {
      var hex = bytes[i].toString(16).toUpperCase();
      crc += hex.length < 2 ? "0" + hex : hex;
    }
    data.dl_crc32 = crc;
    return data;
  }
  if (bytes.length < 2) {
    return data;
  }
  data.dl_fcnt_last_byte = bytes[0];
  var failedCount = bytes[1];
  data.failed_register_count = failedCount;
  if (failedCount > 0) {
    var addresses = [];
    var j;
    for (j = 0; j < failedCount && 2 + j < bytes.length; j++) {
      addresses.push(bytes[2 + j]);
    }
    data.failed_register_addresses = addresses;
  }
  return data;
}

function decodeUplink(input) {
  var bytes = input.bytes || input.data || [];
  var fPort = input.fPort;
  if (fPort === undefined || fPort === null) {
    fPort = 10;
  }
  if (fPort === 0 || bytes.length === 0) {
    return { data: {} };
  }
  if (fPort === 5) {
    return { data: parseResetDiagnostics(bytes) };
  }
  if (fPort === 10) {
    return { data: parseTransducerData(bytes) };
  }
  if (fPort === 100) {
    return { data: parseReadResponse(bytes) };
  }
  if (fPort === 101) {
    return { data: parseWriteResponse(bytes) };
  }
  return { data: {} };
}

function decodeDownlink(input) {
  return {};
}

function extractBusData(input) {
  return {};
}
