function toSigned8(raw) {
  return raw >= 128 ? raw - 256 : raw;
}

function toSigned16(hi, lo) {
  var v = (hi << 8) | lo;
  return v >= 32768 ? v - 65536 : v;
}

function toHex(addr, off, len) {
  var s = "";
  for (var i = 0; i < len; i++) {
    var b = addr[off + i].toString(16).toUpperCase();
    if (b.length < 2) b = "0" + b;
    s += b;
  }
  return s;
}

function toHexPairs(addr, off, len) {
  var s = "";
  for (var i = 0; i < len; i++) {
    if (i > 0) s += ":";
    var b = addr[off + i].toString(16).toUpperCase();
    if (b.length < 2) b = "0" + b;
    s += b;
  }
  return s;
}

function decodeRssi(raw) {
  var v = toSigned8(raw);
  return v > 0 ? -v : v;
}

function parseSensorBlock(out, type, data, dataLen) {
  if (type === 0x67 && dataLen >= 2) {
    var off = dataLen === 3 && data[0] === 0 ? 1 : 0;
    out.mcu_temperature = toSigned16(data[off], data[off + 1]) * 0.1;
    return dataLen;
  }
  if (type === 0xd3 && dataLen >= 1) {
    out.rem_batt_capacity = data[0];
    return 1;
  }
  if (type === 0xbd && dataLen >= 2) {
    out.rem_batt_days = (data[0] << 8) | data[1];
    return 2;
  }
  if (type === 0xba && dataLen >= 1) {
    out.battery_voltage = (data[0] & 0x7f) * 0.01 + 2.5;
    return 1;
  }
  if (type === 0x71 && dataLen >= 6) {
    out.acceleration_vector_xaxis = toSigned16(data[0], data[1]) * 0.001;
    out.acceleration_vector_yaxis = toSigned16(data[2], data[3]) * 0.001;
    out.acceleration_vector_zaxis = toSigned16(data[4], data[5]) * 0.001;
    return 6;
  }
  if (type === 0x00 && dataLen >= 1) {
    out.acceleration_alarm = data[0] === 0xff ? "0xFF" : "0x00";
    return 1;
  }
  return -1;
}

var register_sizes = {
  0x0a: 1,
  0x10: 4, 0x11: 4, 0x12: 4, 0x13: 4,
  0x20: 4, 0x21: 2, 0x24: 4, 0x25: 4, 0x28: 4,
  0x2a: 1, 0x2b: 1, 0x2c: 1,
  0x40: 1, 0x41: 1,
  0x42: 1, 0x43: 1, 0x44: 1, 0x45: 1, 0x46: 1,
  0x4a: 1, 0x4b: 1,
  0x50: 1, 0x51: 1, 0x52: 1, 0x53: 1,
  0x54: 6, 0x55: 6, 0x56: 6, 0x57: 6,
  0x58: 1, 0x59: 1, 0x5b: 1, 0x5c: 1, 0x5f: 6,
  0x6f: 1,
  0x70: 1, 0x71: 4, 0x72: 1, 0x73: 4
};

function decodePort100(bytes, out) {
  if (bytes.length === 4) {
    out.crc32 = "0x" + toHex(bytes, 0, 4);
    return out;
  }
  out.registers = {};
  var i = 0;
  while (i < bytes.length) {
    var addr = bytes[i];
    var size = register_sizes[addr];
    if (!size || i + 1 + size > bytes.length) {
      if (i + 1 >= bytes.length) break;
      size = 1;
    }
    var val = bytes.slice(i + 1, i + 1 + size);
    if (addr === 0x5f && size === 6) {
      out.ble_mac_address = toHexPairs(val, 0, 6);
    } else if (size <= 4) {
      var num = 0;
      for (var n = 0; n < size; n++) num = num * 256 + val[n];
      out.registers["0x" + addr.toString(16)] = num;
    } else {
      out.registers["0x" + addr.toString(16)] = toHex(val, 0, size);
    }
    i += 1 + size;
  }
  return out;
}

function decodeData(input) {
  var bytes = input.bytes || input;
  var fPort = input.fPort;
  if (fPort === undefined || fPort === null || fPort === "") {
    fPort = 10;
  }
  if (fPort === 0 || bytes.length === 0) {
    return {};
  }

  var out = {};

  if (fPort === 10) {
    var i = 0;
    while (i + 1 < bytes.length) {
      var channel = bytes[i];
      if (channel !== 0x00) break;
      var type = bytes[i + 1];
      var consumed = parseSensorBlock(out, type, bytes.slice(i + 2), bytes.length - i - 2);
      if (consumed < 0) break;
      i += 2 + consumed;
    }
    return out;
  }

  if (fPort === 25) {
    var header = bytes[0];
    if (header === 0x0a) {
      out.ble_header = header;
      var n = Math.floor((bytes.length - 1) / 7);
      for (var k = 0; k < n; k++) {
        var off = 1 + k * 7;
        out["ble_" + (k + 1) + "_mac"] = toHexPairs(bytes, off, 6);
        out["ble_" + (k + 1) + "_rssi"] = decodeRssi(bytes[off + 6]);
      }
      return out;
    }
    if (header >= 0xb0 && header <= 0xb3) {
      out.ble_header = header;
      out.ble_filter_range = header - 0xb0;
      var m = Math.floor((bytes.length - 1) / 4);
      for (var j = 0; j < m; j++) {
        var o = 1 + j * 4;
        out["ble_" + (j + 1) + "_lap"] = toHexPairs(bytes, o, 3);
        out["ble_" + (j + 1) + "_rssi"] = decodeRssi(bytes[o + 3]);
      }
      return out;
    }
    return out;
  }

  if (fPort === 100) {
    return decodePort100(bytes, out);
  }

  if (fPort === 101) {
    if (bytes.length < 2) return out;
    out.dl_cmd_fcntdown = bytes[0];
    var s = bytes[1];
    var avail = bytes.length - 2;
    if (s > avail) s = avail;
    out.size = s;
    if (s > 0) {
      var addrs = [];
      for (var a = 0; a < s; a++) {
        addrs.push("0x" + bytes[2 + a].toString(16));
      }
      out.failed_addresses = addrs;
    }
    return out;
  }

  return out;
}

function decodeUplink(input) {
  return { data: decodeData(input) };
}

function decodeDownlink(input) {
  var data = input.data;
  if (data === undefined || data === null) {
    return { bytes: [], fPort: input.fPort };
  }
  if (typeof data === "string") {
    var clean = data.replace(/[^0-9a-fA-F]/g, "");
    var bytes = [];
    for (var i = 0; i + 1 < clean.length; i += 2) {
      bytes.push(parseInt(clean.substr(i, 2), 16));
    }
    return { bytes: bytes, fPort: input.fPort };
  }
  return { bytes: data, fPort: input.fPort };
}

function encodeDownlink(input) {
  return { fPort: input.fPort || 100, bytes: input.bytes || [] };
}
