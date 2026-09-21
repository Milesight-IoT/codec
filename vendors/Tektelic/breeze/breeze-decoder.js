// Tektelic BREEZE / BREEZE-V LoRaWAN payload decoder
// Source: T0007805_TRM_Breeze_BreezeV_v2.1 (TRM v2.1)
// Uplink frame format: Channel ID + Type ID + data blocks, big-endian

function readU16BE(bytes, i) {
  return bytes[i] * 256 + bytes[i + 1];
}

function bytesToHexUpper(bytes, start, len) {
  var out = "";
  for (var i = 0; i < len; i++) {
    var h = (bytes[start + i] & 0xFF).toString(16);
    if (h.length < 2) h = "0" + h;
    out += h.toUpperCase();
  }
  return out;
}

var BREEZE_SENSOR_BLOCKS = [
  { channel: 0x00, type: 0xBA, len: 2, key: "battery_voltage", scale: 1 },
  { channel: 0x00, type: 0xD3, len: 1, key: "rem_batt_capacity_sensor", scale: 1 },
  { channel: 0x11, type: 0xD3, len: 1, key: "rem_batt_capacity_display", scale: 1 },
  { channel: 0x0B, type: 0xE4, len: 2, key: "co2_pressure_compensated", scale: 1 },
  { channel: 0x0E, type: 0xE4, len: 2, key: "co2_raw", scale: 1 },
  { channel: 0x0C, type: 0x73, len: 2, key: "barometric_pressure", scale: 0.1 },
  { channel: 0x03, type: 0x67, len: 2, key: "temperature", scale: 0.1, signed: true },
  { channel: 0x04, type: 0x68, len: 1, key: "relative_humidity", scale: 0.5 },
  { channel: 0x02, type: 0x00, len: 1, key: "light_state", scale: 1, enum: { 0: "Dark", 255: "Bright" } },
  { channel: 0x10, type: 0x02, len: 2, key: "light_intensity", scale: 0.1 },
  { channel: 0x0A, type: 0x00, len: 1, key: "motion_event_state", scale: 1, enum: { 0: "No motion", 255: "Motion detected" } },
  { channel: 0x0D, type: 0x04, len: 2, key: "motion_event_count", scale: 1 }
];

function findBlockDef(channel, type) {
  for (var i = 0; i < BREEZE_SENSOR_BLOCKS.length; i++) {
    if (BREEZE_SENSOR_BLOCKS[i].channel === channel && BREEZE_SENSOR_BLOCKS[i].type === type) {
      return BREEZE_SENSOR_BLOCKS[i];
    }
  }
  return null;
}

function toSigned16(raw) {
  return raw >= 32768 ? raw - 65536 : raw;
}

function decodeSensorFrame(bytes) {
  var data = {};
  var i = 0;
  while (i + 2 <= bytes.length) {
    var channel = bytes[i];
    var type = bytes[i + 1];
    var def = findBlockDef(channel, type);
    if (def === null) {
      break;
    }
    if (i + 2 + def.len > bytes.length) {
      break;
    }
    var raw;
    if (def.len === 1) {
      raw = bytes[i + 2];
    } else {
      raw = readU16BE(bytes, i + 2);
    }
    if (def.signed) {
      raw = toSigned16(raw);
    }
    var value = raw * def.scale;
    if (def.enum && def.enum[raw] !== undefined) {
      value = def.enum[raw];
    }
    data[def.key] = value;
    i += 2 + def.len;
  }
  return data;
}

function decodeTimestampFrame(bytes) {
  var data = {};
  var msgType = bytes[0];
  if (msgType === 0xD7) {
    data.message_type = "local_timestamp_request";
    if (bytes.length > 1) {
      var reqType = bytes[1];
      if (reqType === 0x00) {
        data.request_type = "initial";
      } else if (reqType === 0x01) {
        data.request_type = "update";
      } else {
        data.request_type = reqType;
      }
    }
    if (bytes.length > 2) {
      data.request_id = bytes[2];
    }
  } else if (msgType === 0x85) {
    data.message_type = "sensor_timestamp_response";
    if (bytes.length >= 5) {
      var ts = bytes[1] * 16777216 + bytes[2] * 65536 + bytes[3] * 256 + bytes[4];
      data.time_response = ts;
    }
  }
  return data;
}

var BREEZE_REG_WIDTHS = {
  0x20: 4, 0x21: 1, 0x2A: 1, 0x2C: 6,
  0x30: 3, 0x31: 2, 0x32: 1, 0x33: 4, 0x34: 1,
  0x38: 1, 0x39: 4, 0x3A: 4, 0x3B: 2, 0x3C: 1, 0x3D: 2, 0x3E: 1,
  0x40: 1,
  0x47: 3, 0x48: 2, 0x49: 1, 0x4A: 1, 0x4B: 1,
  0x50: 2, 0x51: 2, 0x52: 2, 0x53: 1, 0x54: 2,
  0x66: 1, 0x67: 1, 0x68: 3, 0x69: 4, 0x6A: 3,
  0x6F: 1, 0x70: 2, 0x71: 7, 0x72: 1
};

function decodeReadResponse(bytes) {
  var data = {};
  var regs = [];
  var i = 0;
  var flatCount = 0;
  while (i < bytes.length) {
    var addr = bytes[i];
    var width = BREEZE_REG_WIDTHS[addr];
    if (width === undefined) {
      width = bytes.length - i - 1;
      if (width <= 0) {
        break;
      }
    }
    if (i + 1 + width > bytes.length) {
      break;
    }
    var raw = 0;
    var k;
    for (k = 0; k < width; k++) {
      raw = raw * 256 + bytes[i + 1 + k];
    }
    var entry = { address: addr, value: raw };
    if (addr === 0x71) {
      entry.app_version = bytes[i + 1] + "." + bytes[i + 2] + "." + bytes[i + 3];
      entry.loramac_version = bytes[i + 4] + "." + bytes[i + 5] + "." + bytes[i + 6];
      entry.loramac_region = bytes[i + 7];
      data.app_version = entry.app_version;
      data.loramac_version = entry.loramac_version;
      data.loramac_region = entry.loramac_region;
    }
    regs.push(entry);
    if (flatCount < 8) {
      var hex = addr.toString(16);
      if (hex.length < 2) hex = "0" + hex;
      data["register_0x" + hex] = String(entry.value);
      flatCount++;
    }
    i += 1 + width;
  }
  return data;
}

function decodeWriteResponse(bytes) {
  var data = {};
  data.dl_fcntdown_lsb = bytes[0];
  var size = bytes[1];
  data.size = size;
  var failed = [];
  var i;
  for (i = 0; i < size && 2 + i < bytes.length; i++) {
    failed.push(bytes[2 + i]);
  }
  for (i = 0; i < failed.length; i++) {
    data["failed_address_" + (i + 1)] = failed[i];
  }
  return data;
}

function decodeUplink(input) {
  var bytes = input.bytes;
  var fPort = input.fPort;
  if (fPort === undefined || fPort === null) {
    fPort = 10;
  }
  if (!bytes || bytes.length === 0) {
    return { data: {} };
  }
  var data;
  if (fPort === 10) {
    data = decodeSensorFrame(bytes);
  } else if (fPort === 20) {
    data = decodeTimestampFrame(bytes);
  } else if (fPort === 100) {
    data = decodeReadResponse(bytes);
  } else if (fPort === 101) {
    data = decodeWriteResponse(bytes);
  } else {
    data = {};
  }
  return { data: data };
}

function Decode(fPort, bytes) {
  return decodeUplink({ bytes: bytes, fPort: fPort });
}

function Decoder(bytes, port) {
  return decodeUplink({ bytes: bytes, fPort: port });
}
