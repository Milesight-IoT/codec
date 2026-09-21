function decodeUint16(bytes, offset) {
  return bytes[offset] * 256 + bytes[offset + 1];
}

function toSigned(raw, bits) {
  if (raw >= Math.pow(2, bits - 1)) {
    return raw - Math.pow(2, bits);
  }
  return raw;
}

function writeUtcTimestamp(bytes, offset, data, suffix) {
  var raw = (bytes[offset] * 16777216) + (bytes[offset + 1] * 65536) + (bytes[offset + 2] * 256) + bytes[offset + 3];
  data["utc_year" + suffix] = (raw >>> 26) + 2020;
  data["utc_month" + suffix] = (raw >>> 22) & 0x0F;
  data["utc_day" + suffix] = (raw >>> 17) & 0x1F;
  data["utc_hour" + suffix] = (raw >>> 12) & 0x1F;
  data["utc_minute" + suffix] = (raw >>> 6) & 0x3F;
  data["utc_second" + suffix] = raw & 0x3F;
}

function decodeCoordinates(bytes, offset) {
  var latRaw = (bytes[offset] * 65536) + (bytes[offset + 1] * 256) + bytes[offset + 2];
  var lonRaw = (bytes[offset + 3] * 65536) + (bytes[offset + 4] * 256) + bytes[offset + 5];
  var altRaw = (bytes[offset + 6] * 256) + bytes[offset + 7];
  return {
    latitude: Math.round(toSigned(latRaw, 24) * (90 / 8388608) * 1000000) / 1000000,
    longitude: Math.round(toSigned(lonRaw, 24) * (180 / 8388608) * 1000000) / 1000000,
    altitude: Math.round(altRaw * (9500 / 65536) - 500)
  };
}

function dzStatus(value, offset, labels) {
  var v = (value >>> (offset * 2)) & 0x03;
  return v < labels.length ? labels[v] : "Unknown";
}

function toMac(bytes, offset, length) {
  var parts = [];
  for (var i = 0; i < length; i++) {
    parts.push(("0" + bytes[offset + i].toString(16)).slice(-2).toUpperCase());
  }
  return parts.join(":");
}

function toHex(bytes, offset, length) {
  var parts = [];
  for (var i = 0; i < length; i++) {
    parts.push(("0" + bytes[offset + i].toString(16)).slice(-2));
  }
  return parts.join(" ");
}

function decodeGnssDiagnostic(type, bytes, offset, data) {
  if (type === 0x3C) {
    data.num_satellites = bytes[offset];
    return 3;
  }
  if (type === 0x64) {
    data.avg_satellite_snr = toSigned(decodeUint16(bytes, offset), 16) * 0.1;
    return 4;
  }
  if (type === 0x0F) {
    data.log_num = decodeUint16(bytes, offset);
    return 4;
  }
  if (type === 0x95) {
    var fixMap = ["no_fix", "no_fix", "2d_fix", "3d_fix"];
    data.fix_type = fixMap[bytes[offset] & 0x03];
    return 3;
  }
  if (type === 0x96) {
    data.time_to_fix = decodeUint16(bytes, offset);
    return 4;
  }
  if (type === 0x97) {
    data.gnss_horizontal_accuracy = decodeUint16(bytes, offset);
    data.gnss_vertical_accuracy = decodeUint16(bytes, offset + 2);
    return 6;
  }
  if (type === 0x98) {
    data.ground_speed_accuracy = ((bytes[offset] * 16777216) + (bytes[offset + 1] * 65536) + (bytes[offset + 2] * 256) + bytes[offset + 3]) * 0.001;
    return 6;
  }
  if (type === 0x99) {
    data.num_of_fixes = bytes[offset];
    return 3;
  }
  return 0;
}

function decodePort10(bytes, data, errors) {
  var i = 0;
  while (i < bytes.length) {
    var channel = bytes[i];
    var type = bytes[i + 1];
    var consumed = 0;
    if (channel === 0x00 && type === 0xD3) {
      data.rem_batt_capacity = bytes[i + 2];
      consumed = 3;
    } else if (channel === 0x00 && type === 0xBD) {
      data.rem_batt_days = decodeUint16(bytes, i + 2);
      consumed = 4;
    } else if (channel === 0x00 && type === 0x85) {
      writeUtcTimestamp(bytes, i + 2, data, "");
      consumed = 6;
    } else if (channel === 0x00 && type === 0x88) {
      var coords = decodeCoordinates(bytes, i + 2);
      data.latitude = coords.latitude;
      data.longitude = coords.longitude;
      data.altitude = coords.altitude;
      consumed = 10;
    } else if (channel === 0x00 && type === 0x92) {
      data.ground_speed = Math.round(bytes[i + 2] * (5 / 18) * 10) / 10;
      consumed = 3;
    } else if (channel === 0x00 && type === 0x00) {
      data.gnss_fix = "invalid";
      consumed = 3;
    } else if (channel === 0x00 && type === 0x95) {
      var gnssLabels = ["Unknown", "Inside", "Outside"];
      data.gnss_status_dz0 = dzStatus(bytes[i + 2], 0, gnssLabels);
      data.gnss_status_dz1 = dzStatus(bytes[i + 2], 1, gnssLabels);
      data.gnss_status_dz2 = dzStatus(bytes[i + 2], 2, gnssLabels);
      data.gnss_status_dz3 = dzStatus(bytes[i + 2], 3, gnssLabels);
      consumed = 3;
    } else if (channel === 0x01 && type === 0x95) {
      var bleLabels = ["Unknown", "Inside", "Outside", "Near"];
      data.ble_status_dz0 = dzStatus(bytes[i + 2], 0, bleLabels);
      data.ble_status_dz1 = dzStatus(bytes[i + 2], 1, bleLabels);
      data.ble_status_dz2 = dzStatus(bytes[i + 2], 2, bleLabels);
      data.ble_status_dz3 = dzStatus(bytes[i + 2], 3, bleLabels);
      consumed = 3;
    } else if (channel === 0x02 && type === 0x95) {
      data.safety_status_eb = (bytes[i + 2] & 0x01) !== 0 ? 1 : 0;
      data.safety_status_fall = (bytes[i + 2] & 0x02) !== 0 ? 1 : 0;
      data.safety_status_sh = (bytes[i + 2] & 0x04) !== 0 ? 1 : 0;
      data.safety_status_ear = (bytes[i + 2] & 0x08) !== 0 ? 1 : 0;
      data.safety_status_pressure = (bytes[i + 2] & 0x10) !== 0 ? 1 : 0;
      consumed = 3;
    } else if (channel === 0x00 && type === 0x71) {
      data.acceleration_x = toSigned(decodeUint16(bytes, i + 2), 16) * 0.001;
      data.acceleration_y = toSigned(decodeUint16(bytes, i + 4), 16) * 0.001;
      data.acceleration_z = toSigned(decodeUint16(bytes, i + 6), 16) * 0.001;
      consumed = 8;
    } else if (channel === 0x00 && (type === 0x73 || type === 0x74)) {
      data.barometric_pressure = decodeUint16(bytes, i + 2) * 0.1;
      consumed = 4;
    } else if (channel === 0x00 && type === 0x67) {
      data.temperature = toSigned(decodeUint16(bytes, i + 2), 16) * 0.1;
      consumed = 4;
    } else if (channel === 0x0D) {
      consumed = decodeGnssDiagnostic(type, bytes, i + 2, data);
    }
    if (!consumed) {
      errors.push("unknown block at offset " + i + " (channel 0x" + channel.toString(16) + ", type 0x" + type.toString(16) + ")");
      consumed = 2;
    }
    i += consumed;
  }
}

function decodePort15(bytes, data, errors) {
  if (bytes.length === 1 && bytes[0] === 0x00) {
    data.no_log = true;
    return;
  }
  if (bytes[0] === 0x01) {
    data.fragment = bytes[1];
    writeUtcTimestamp(bytes, 2, data, "");
    return;
  }
  if (bytes[0] === 0x02) {
    data.fragment = bytes[1];
    var coords = decodeCoordinates(bytes, 2);
    data.latitude = coords.latitude;
    data.longitude = coords.longitude;
    data.altitude = coords.altitude;
    return;
  }
  if (bytes[0] === 0x03) {
    data.counter = bytes[1];
    var offset = 2;
    var index = 1;
    while (offset + 12 <= bytes.length) {
      var suffix = index > 1 ? "_" + index : "";
      writeUtcTimestamp(bytes, offset, data, suffix);
      var coords = decodeCoordinates(bytes, offset + 4);
      data["latitude" + suffix] = coords.latitude;
      data["longitude" + suffix] = coords.longitude;
      data["altitude" + suffix] = coords.altitude;
      offset += 12;
      index++;
    }
    return;
  }
  errors.push("unknown log format 0x" + bytes[0].toString(16));
}

function decodePort25(bytes, data, errors) {
  var header = bytes[0];
  var filtered = header >= 0xB0 && header <= 0xB3;
  if (!filtered && header !== 0x0A) {
    errors.push("unknown ble report header 0x" + header.toString(16));
    return;
  }
  var recordSize = filtered ? 4 : 7;
  var offset = 1;
  var index = 1;
  while (offset + recordSize <= bytes.length) {
    if (filtered) {
      data["ble_" + index + "_lap"] = toMac(bytes, offset, 3);
      data["ble_" + index + "_rssi"] = toSigned(bytes[offset + 3], 8);
    } else {
      data["ble_" + index + "_mac"] = toMac(bytes, offset, 6);
      data["ble_" + index + "_rssi"] = toSigned(bytes[offset + 6], 8);
    }
    offset += recordSize;
    index++;
  }
}

function decodePort5(bytes, data, errors) {
  if (bytes[0] !== 0x40) {
    errors.push("unknown diagnostic query 0x" + bytes[0].toString(16));
    return;
  }
  if (bytes[1] === 0x06) {
    data.reset_reason = bytes[2];
    data.power_loss_reset_count = bytes[3];
    data.watchdog_reset_count = bytes[4];
    data.sw_reset_count = bytes[5];
    data.button_reset_count = bytes[6];
  } else if (bytes[1] === 0x07) {
    data.rfu = bytes[2];
    data.barometer_failure = bytes[3];
    data.i2c_failure = bytes[4];
  } else {
    errors.push("unknown diagnostic type 0x" + bytes[1].toString(16));
  }
}

function decodePort100(bytes, data, errors) {
  if (bytes.length > 0) {
    data.register_address = "0x" + ("0" + bytes[0].toString(16)).slice(-2);
    data.register_value = toHex(bytes, 1, bytes.length - 1);
  }
}

function decodePort101(bytes, data, errors) {
  data.dl_command_fcntdown = bytes[0];
  data.size = bytes[1];
  var failed = 0;
  for (var i = 0; i < bytes[1] && i + 2 < bytes.length; i++) {
    failed++;
  }
  data.failed_register_count = failed;
}

function decodeUplink(input) {
  var bytes = input.bytes || input.data || [];
  var fPort = input.fPort === undefined || input.fPort === null ? 10 : input.fPort;
  var data = {};
  var errors = [];
  if (fPort === 5) {
    decodePort5(bytes, data, errors);
  } else if (fPort === 10) {
    decodePort10(bytes, data, errors);
  } else if (fPort === 15) {
    decodePort15(bytes, data, errors);
  } else if (fPort === 25) {
    decodePort25(bytes, data, errors);
  } else if (fPort === 100) {
    decodePort100(bytes, data, errors);
  } else if (fPort === 101) {
    decodePort101(bytes, data, errors);
  } else {
    errors.push("unsupported fPort " + fPort);
  }
  return { data: data, errors: errors };
}

function decodeDownlink(input) {
  var bytes = input.bytes || [];
  var fPort = input.fPort;
  var data = {};
  var errors = [];
  if (fPort === 100) {
    var first = bytes[0];
    if (first === 0xF0) {
      data.command = "save_to_flash";
      if (bytes[2] === 0x01) {
        data.command = "soft_reset";
      }
      data.options = "0x" + ("0" + bytes[1].toString(16)).slice(-2);
    } else if (first === 0xF2) {
      data.command = "factory_reset";
      data.options = "0x" + ("0" + bytes[1].toString(16)).slice(-2);
    } else if ((first & 0x80) !== 0) {
      data.command = "write_register";
      data.register_address = "0x" + ("0" + (first & 0x7F).toString(16)).slice(-2);
      data.value = toHex(bytes, 1, bytes.length - 1);
    } else {
      data.command = "read_register";
      data.register_address = "0x" + ("0" + first.toString(16)).slice(-2);
    }
  } else if (fPort === 10) {
    data.ear_state = bytes[2] === 0xFF ? "emergency" : "normal";
  } else if (fPort === 15) {
    if (bytes[0] === 0x0A) {
      data.log_request = "type_a";
      writeUtcTimestamp(bytes, 1, data, "");
      data.count = bytes[5];
    } else if (bytes[0] === 0x0B) {
      data.log_request = "type_b";
      data.count = bytes[1];
    }
  } else if (fPort === 5) {
    data.command = "diagnostics_query";
  } else {
    errors.push("unsupported fPort " + fPort);
  }
  return { data: data, errors: errors };
}

function encodeDownlink(input) {
  var data = input.data || {};
  var fPort = input.fPort;
  var bytes = [];
  var errors = [];
  if (fPort === 100) {
    if (data.command === "soft_reset") {
      bytes = [0xF0, 0x00, 0x01];
    } else if (data.command === "save_to_flash") {
      bytes = [0xF0, data.options === "loramac" ? 0x40 : data.options === "both" ? 0x60 : 0x20, 0x00];
    } else if (data.command === "factory_reset") {
      bytes = [0xF2, data.scope === "loramac" ? 0xB0 : data.scope === "both" ? 0xBA : 0x0A];
    } else if (data.command === "write_register") {
      bytes = [parseInt(data.register_address, 16) | 0x80].concat(data.value || []);
    } else if (data.command === "read_register") {
      bytes = [parseInt(data.register_address, 16) & 0x7F];
    } else {
      errors.push("unknown command");
    }
  } else if (fPort === 10 && data.ear_state) {
    bytes = [0x00, 0x01, data.ear_state === "emergency" ? 0xFF : 0x00];
  } else if (fPort === 15 && data.log_request === "type_a") {
    var raw = (((data.utc_year || 2020) - 2020) << 26) | ((data.utc_month || 1) << 22) | ((data.utc_day || 1) << 17) | ((data.utc_hour || 0) << 12) | ((data.utc_minute || 0) << 6) | (data.utc_second || 0);
    bytes = [0x0A, (raw >>> 24) & 0xFF, (raw >>> 16) & 0xFF, (raw >>> 8) & 0xFF, raw & 0xFF, data.count || 1];
  } else if (fPort === 15 && data.log_request === "type_b") {
    bytes = [0x0B, data.count || 1];
  } else if (fPort === 5) {
    bytes = [0x40];
  } else {
    errors.push("unsupported fPort " + fPort);
  }
  return { bytes: bytes, fPort: fPort, errors: errors };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { decodeUplink: decodeUplink, decodeDownlink: decodeDownlink, encodeDownlink: encodeDownlink };
}
