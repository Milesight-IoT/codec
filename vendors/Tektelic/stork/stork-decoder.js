function toSigned(value, bits) {
  if (value >= (1 << (bits - 1))) {
    return value - (1 << bits);
  }
  return value;
}

function bytesToHex(bytes) {
  var parts = [];
  for (var i = 0; i < bytes.length; i++) {
    parts.push(("0" + bytes[i].toString(16)).slice(-2));
  }
  return parts.join(":").toUpperCase();
}

function parseSensorBlock(out, bytes, start, end) {
  if (end - start < 2) {
    return;
  }
  var channel = bytes[start];
  var type = bytes[start + 1];
  var data = bytes.slice(start + 2, end);
  var i;

  if (channel === 0x00 && type === 0xd3 && data.length >= 1) {
    out.rem_batt_capacity = data[0];
    return;
  }
  if (channel === 0x00 && type === 0xbd && data.length >= 2) {
    out.rem_batt_days = (data[0] << 8) | data[1];
    return;
  }
  if (channel === 0x00 && type === 0xba && data.length >= 1) {
    out.battery_voltage = Math.round((data[0] * 0.01 + 2.5) * 100) / 100;
    return;
  }
  if (channel === 0x00 && type === 0x95 && data.length >= 1) {
    var raw = data[0];
    var gnss = raw & 0x03;
    out.geolocation_cycle_failed_gnss = gnss;
    out.geolocation_cycle_failed_wi_fi = (raw >> 2) & 0x01;
    out.geolocation_cycle_failed_ble = (raw >> 3) & 0x01;
    out.geolocation_cycle_failed_duty_cycle = (raw >> 4) & 0x01;
    return;
  }
  if (channel === 0x00 && type === 0x00 && data.length >= 1) {
    out.acceleration_alarm = data[0];
    return;
  }
  if (channel === 0x00 && type === 0x71 && data.length >= 6) {
    var x = toSigned((data[0] << 8) | data[1], 16);
    var y = toSigned((data[2] << 8) | data[3], 16);
    var z = toSigned((data[4] << 8) | data[5], 16);
    out.acceleration_xaxis = x * 0.001;
    out.acceleration_yaxis = y * 0.001;
    out.acceleration_zaxis = z * 0.001;
    return;
  }
  if (channel === 0x03 && type === 0x67 && data.length >= 2) {
    out.temperature = toSigned((data[0] << 8) | data[1], 16) * 0.1;
    return;
  }
  if (channel === 0x04 && type === 0x68 && data.length >= 1) {
    out.relative_humidity = data[0] * 0.5;
    return;
  }
}

function decodePort10(bytes) {
  var out = {};
  var i = 0;
  while (i < bytes.length) {
    if (i + 2 > bytes.length) {
      break;
    }
    var channel = bytes[i];
    var type = bytes[i + 1];
    var blockLen = 0;
    if (channel === 0x00 && (type === 0xd3 || type === 0xba || type === 0x00 || type === 0x95)) {
      blockLen = 3;
    } else if (channel === 0x00 && (type === 0xbd || type === 0x67)) {
      blockLen = 4;
    } else if (channel === 0x00 && type === 0x71) {
      blockLen = 8;
    } else if (channel === 0x03 && type === 0x67) {
      blockLen = 4;
    } else if (channel === 0x04 && type === 0x68) {
      blockLen = 3;
    } else {
      blockLen = 3;
    }
    var end = Math.min(i + blockLen, bytes.length);
    parseSensorBlock(out, bytes, i, end);
    i = end;
  }
  return out;
}

function decodePort16(bytes) {
  var out = decodePort10(bytes);
  return out;
}

function decodePort25(bytes) {
  var out = {};
  if (bytes.length < 1) {
    return out;
  }
  var header = bytes[0];
  if (header === 0x0a) {
    var count = (bytes.length - 1) / 7;
    for (var i = 0; i < count; i++) {
      var base = 1 + i * 7;
      var macBytes = bytes.slice(base, base + 6);
      var rssi = toSigned(bytes[base + 6], 8);
      out["ble_" + (i + 1) + "_mac"] = bytesToHex(macBytes);
      out["ble_" + (i + 1) + "_rssi"] = rssi;
    }
    return out;
  }
  if (header >= 0xb0 && header <= 0xb3) {
    out.filter_range = header - 0xb0;
    var countF = (bytes.length - 1) / 4;
    for (var j = 0; j < countF; j++) {
      var baseF = 1 + j * 4;
      var lapBytes = bytes.slice(baseF, baseF + 3);
      var rssiRaw = bytes[baseF + 3];
      var rssiF = rssiRaw < 0x80 ? -rssiRaw : toSigned(rssiRaw, 8);
      out["ble_" + (j + 1) + "_lap"] = bytesToHex(lapBytes);
      out["ble_" + (j + 1) + "_rssi"] = rssiF;
    }
    return out;
  }
  out.raw_hex = bytesToHex(bytes);
  return out;
}

var REGISTER_SIZES = {
  0x20: 4,
  0x21: 2
};

function decodePort100(bytes) {
  var out = {};
  var registerCount = 0;
  var i = 0;
  while (i < bytes.length) {
    var address = bytes[i] & 0x7f;
    var size = REGISTER_SIZES[address];
    if (!size) {
      size = bytes.length - 1 - i;
      if (size <= 0) {
        size = 1;
      }
    }
    var value = 0;
    var j;
    for (j = i + 1; j <= i + size && j < bytes.length; j++) {
      value = value * 256 + bytes[j];
    }
    registerCount++;
    i = j;
  }
  out.register_count = registerCount;
  return out;
}

function decodePort101(bytes) {
  var out = {};
  if (bytes.length < 2) {
    out.raw_hex = bytesToHex(bytes);
    return out;
  }
  out.dl_fcnt_down_lsb = bytes[0];
  var size = bytes[1] & 0x0f;
  out.size = size;
  var failedCount = 0;
  for (var i = 0; i < size && 2 + i < bytes.length; i++) {
    failedCount++;
  }
  out.failed_address_count = failedCount;
  return out;
}

function decodeUplink(input, callback) {
  var bytes;
  try {
    if (input.bytes) {
      bytes = input.bytes;
    } else if (input.data && typeof input.data === "string") {
      bytes = hexToBytes(input.data);
    } else {
      bytes = [];
    }
  } catch (e) {
    bytes = [];
  }
  var fPort = input.fPort !== undefined ? input.fPort : 10;
  var out;
  if (fPort === 192 || fPort === 197 || fPort === 199) {
    out = {};
  } else if (fPort === 16) {
    out = decodePort16(bytes);
  } else if (fPort === 25) {
    out = decodePort25(bytes);
  } else if (fPort === 100) {
    out = decodePort100(bytes);
  } else if (fPort === 101) {
    out = decodePort101(bytes);
  } else {
    out = decodePort10(bytes);
  }
  if (callback) {
    callback({ data: out });
  }
  return { data: out };
}

function decodeDownlink(input, callback) {
  var bytes;
  try {
    if (input.bytes) {
      bytes = input.bytes;
    } else if (input.data && typeof input.data === "string") {
      bytes = hexToBytes(input.data);
    } else {
      bytes = [];
    }
  } catch (e) {
    bytes = [];
  }
  if (callback) {
    callback({ data: { fport: input.fPort !== undefined ? input.fPort : 99, bytes: bytes } });
  }
  return { data: { fport: input.fPort !== undefined ? input.fPort : 99, bytes: bytes } };
}

function hexToBytes(hex) {
  var clean = hex.replace(/[^0-9a-fA-F]/g, "");
  var bytes = [];
  for (var i = 0; i + 1 < clean.length; i += 2) {
    bytes.push(parseInt(clean.substr(i, 2), 16));
  }
  return bytes;
}

function toHex(bytes) {
  if (!bytes || bytes.length === 0) {
    return "";
  }
  var parts = [];
  for (var i = 0; i < bytes.length; i++) {
    parts.push(("0" + bytes[i].toString(16)).slice(-2));
  }
  return parts.join(" ");
}

function encodeDownlink(input, callback) {
  var fPort = input.fPort !== undefined ? input.fPort : 99;
  var bytes = [];
  if (input.bytes) {
    bytes = input.bytes;
  } else if (input.data && typeof input.data === "string") {
    bytes = hexToBytes(input.data);
  }
  if (callback) {
    callback({ fPort: fPort, bytes: bytes });
  }
  return { fPort: fPort, bytes: bytes };
}

module.exports = {
  decodeUplink: decodeUplink,
  decodeDownlink: decodeDownlink,
  encodeDownlink: encodeDownlink,
  hexToBytes: hexToBytes,
  toHex: toHex
};
