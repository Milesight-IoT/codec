var ORCA_REGISTER_WIDTHS = {
  0x10: 2, 0x11: 2, 0x12: 2, 0x13: 2, 0x14: 2, 0x15: 2,
  0x20: 4, 0x21: 2, 0x22: 2, 0x23: 2, 0x24: 2, 0x25: 2,
  0x26: 2, 0x27: 2, 0x28: 2, 0x29: 2,
  0x30: 1, 0x31: 2, 0x32: 1, 0x33: 1, 0x34: 1,
  0x35: 1, 0x36: 1, 0x37: 1,
  0x40: 1, 0x41: 1, 0x42: 2, 0x43: 2, 0x44: 2, 0x45: 2, 0x46: 1,
  0x50: 1, 0x51: 1, 0x52: 2, 0x53: 2,
  0x54: 9, 0x55: 9, 0x56: 9, 0x57: 9,
  0x60: 2, 0x61: 2, 0x62: 2, 0x63: 2,
  0x70: 2, 0x71: 7, 0x72: 1
};

function toHexUpper(bytes) {
  var s = "";
  for (var i = 0; i < bytes.length; i++) {
    var h = (bytes[i] & 0xFF).toString(16).toUpperCase();
    if (h.length < 2) h = "0" + h;
    s += h;
  }
  return s;
}

function u16(bytes, off) {
  return ((bytes[off] & 0xFF) << 8) | (bytes[off + 1] & 0xFF);
}

function s16(bytes, off) {
  var v = u16(bytes, off);
  return v >= 0x8000 ? v - 0x10000 : v;
}

function s24(bytes, off) {
  var v = (bytes[off] << 16) | (bytes[off + 1] << 8) | bytes[off + 2];
  return v >= 0x800000 ? v - 0x1000000 : v;
}

function s32(bytes, off) {
  var v = ((bytes[off] << 24) >>> 0) + ((bytes[off + 1] << 16) >>> 0) +
    ((bytes[off + 2] << 8) >>> 0) + (bytes[off + 3] >>> 0);
  return v >= 0x80000000 ? v - 0x100000000 : v;
}

function round6(v) {
  return Math.round(v * 1000000) / 1000000;
}

function round1(v) {
  return Math.round(v * 10) / 10;
}

function setUtc7(data, prefix, bytes, off) {
  data[prefix + "utc_year"] = (bytes[off] << 8) | bytes[off + 1];
  data[prefix + "utc_month"] = bytes[off + 2];
  data[prefix + "utc_day"] = bytes[off + 3];
  data[prefix + "utc_hour"] = bytes[off + 4];
  data[prefix + "utc_minute"] = bytes[off + 5];
  data[prefix + "utc_second"] = bytes[off + 6];
}

function setCoordinates9(data, prefix, bytes, off) {
  data[prefix + "latitude"] = round6(s24(bytes, off) * 0.0000125);
  data[prefix + "longitude"] = round6(s32(bytes, off + 3) * 0.0000001);
  data[prefix + "altitude"] = round1(s16(bytes, off + 7) * 0.5);
}

function registerWidth(addr) {
  if (ORCA_REGISTER_WIDTHS.hasOwnProperty(addr)) {
    return ORCA_REGISTER_WIDTHS[addr];
  }
  return 2;
}

function decodePort10(bytes) {
  var data = {};
  var i = 0;
  while (i + 2 <= bytes.length) {
    var channel = bytes[i];
    var type = bytes[i + 1];
    var p = i + 2;
    var remaining = bytes.length - p;
    if (channel === 0x01 && type === 0xBA && remaining >= 1) {
      data.battery1_voltage = round6((bytes[p] & 0x7F) * 0.01 + 2.5);
      data.battery1_eos_alert = (bytes[p] >> 7) & 0x01;
      i = p + 1;
    } else if (channel === 0x02 && type === 0xBA && remaining >= 1) {
      data.battery2_voltage = round6((bytes[p] & 0x7F) * 0.01 + 2.5);
      data.battery2_eos_alert = (bytes[p] >> 7) & 0x01;
      i = p + 1;
    } else if (channel === 0x00 && type === 0x85 && remaining >= 7) {
      setUtc7(data, "", bytes, p);
      i = p + 7;
    } else if (channel === 0x00 && type === 0x88 && remaining >= 9) {
      setCoordinates9(data, "", bytes, p);
      i = p + 9;
    } else if (channel === 0x00 && type === 0x92 && remaining >= 2) {
      data.ground_speed = round1(u16(bytes, p) * 0.1);
      i = p + 2;
    } else if (channel === 0x00 && type === 0x04 && remaining >= 1) {
      data.fsm_state = bytes[p];
      i = p + 1;
    } else if (channel === 0x00 && type === 0x95 && remaining >= 1) {
      data.fix_utc = bytes[p] & 0x01;
      data.fix_position = (bytes[p] >> 1) & 0x01;
      i = p + 1;
    } else if (channel === 0x01 && type === 0x95 && remaining >= 1) {
      data.geofence_status_0 = bytes[p] & 0x03;
      data.geofence_status_1 = (bytes[p] >> 2) & 0x03;
      data.geofence_status_2 = (bytes[p] >> 4) & 0x03;
      data.geofence_status_3 = (bytes[p] >> 6) & 0x03;
      i = p + 1;
    } else if (channel === 0x00 && type === 0x00 && remaining >= 1) {
      data.acceleration_alarm = bytes[p] === 0xFF ? 1 : 0;
      i = p + 1;
    } else if (channel === 0x00 && type === 0x71 && remaining >= 6) {
      data.acceleration_xaxis = round6(s16(bytes, p) * 0.001);
      data.acceleration_yaxis = round6(s16(bytes, p + 2) * 0.001);
      data.acceleration_zaxis = round6(s16(bytes, p + 4) * 0.001);
      i = p + 6;
    } else if (channel === 0x00 && type === 0x67 && remaining >= 2) {
      data.temperature = round1(s16(bytes, p) * 0.1);
      i = p + 2;
    } else {
      i = p;
    }
  }
  return data;
}

function decodePort15(bytes) {
  if (bytes.length === 0) {
    return {};
  }
  var data = {};
  if (bytes.length === 1 && bytes[0] === 0x00) {
    data.data_type = "0x00";
    data.no_log = true;
    return data;
  }
  if (bytes.length < 2) {
    return { data_type: "0x" + toHexUpper([bytes[0]]) };
  }
  var type = bytes[0];
  var fragment = bytes[1];
  var payload = bytes.slice(2);
  data.data_type = "0x" + toHexUpper([type]);
  data.log_fragment_number = fragment;
  var k, count;
  if (type === 0x01 && payload.length >= 7) {
    setUtc7(data, "", payload, 0);
  } else if (type === 0x02 && payload.length >= 9) {
    setCoordinates9(data, "", payload, 0);
  } else if (type === 0x03) {
    count = 0;
    k = 0;
    while (payload.length - k >= 16) {
      count += 1;
      if (count === 1) {
        setUtc7(data, "", payload, k);
        setCoordinates9(data, "", payload, k + 7);
      } else {
        setUtc7(data, "log_" + count + "_", payload, k);
        setCoordinates9(data, "log_" + count + "_", payload, k + 7);
      }
      k += 16;
    }
  }
  return data;
}

function decodePort16(bytes) {
  var data = {};
  var i = 0;
  while (i + 2 <= bytes.length) {
    var channel = bytes[i];
    var type = bytes[i + 1];
    var p = i + 2;
    var remaining = bytes.length - p;
    if (channel === 0x0D && type === 0x3C && remaining >= 1) {
      data.num_satellites = bytes[p];
      i = p + 1;
    } else if (channel === 0x0D && type === 0x64 && remaining >= 2) {
      data.avg_satellite_snr = round1(s16(bytes, p) * 0.1);
      i = p + 2;
    } else if (channel === 0x0D && type === 0x95 && remaining >= 1) {
      data.fix_type = bytes[p];
      i = p + 1;
    } else if (channel === 0x0D && type === 0x96 && remaining >= 2) {
      data.time_to_fix = u16(bytes, p);
      i = p + 2;
    } else if (channel === 0x0D && type === 0x0F && remaining >= 2) {
      data.log_num = u16(bytes, p);
      i = p + 2;
    } else if (channel === 0x0D && type === 0x04 && remaining >= 2) {
      data.ghost_error_count = u16(bytes, p);
      i = p + 2;
    } else {
      i = p;
    }
  }
  return data;
}

function decodePort25(bytes) {
  if (bytes.length === 0) {
    return {};
  }
  var type = bytes[0];
  var data = {};
  var p = 1;
  var count = 0;
  if (type === 0x0A) {
    data.message_type = "0x0A basic";
    while (bytes.length - p >= 7) {
      count += 1;
      var mac = toHexUpper(bytes.slice(p, p + 6));
      var rssi = bytes[p + 6] >= 128 ? bytes[p + 6] - 256 : bytes[p + 6];
      if (count === 1) {
        data.mac = mac;
        data.rssi_dbm = rssi;
      }
      data["ble_" + count + "_mac"] = mac;
      data["ble_" + count + "_rssi_dbm"] = rssi;
      p += 7;
    }
  } else if (type >= 0xB0 && type <= 0xB3) {
    data.message_type = "0xB" + type.toString(16).charAt(1) + " filtered range " + (type - 0xB0);
    while (bytes.length - p >= 4) {
      count += 1;
      var lap = toHexUpper(bytes.slice(p, p + 3));
      var r = bytes[p + 3] >= 128 ? bytes[p + 3] - 256 : bytes[p + 3];
      data["ble_" + count + "_lap"] = lap;
      data["ble_" + count + "_rssi_dbm"] = r;
      p += 4;
    }
  } else {
    data.message_type = "0x" + toHexUpper([type]) + " unknown";
  }
  return data;
}

function decodePort100(bytes) {
  var data = {};
  var i = 0;
  if (bytes.length > 0 && (bytes[0] & 0x80) !== 0) {
    var crcLen = bytes.length >= 4 ? 4 : bytes.length;
    var crc = 0;
    for (var c = 0; c < crcLen; c++) {
      crc = crc * 256 + bytes[c];
    }
    data.write_ack_crc32 = crc >>> 0;
    data.write_ack_crc32_hex = "0x" + toHexUpper(bytes.slice(0, crcLen));
  }
  return data;
}

function decodeUplink(input) {
  var bytes = input.bytes;
  var fPort = input.fPort;
  if (fPort === undefined || fPort === null) {
    fPort = 10;
  }
  var data = {};
  if (fPort === 10) {
    data = decodePort10(bytes);
  } else if (fPort === 15) {
    data = decodePort15(bytes);
  } else if (fPort === 16) {
    data = decodePort16(bytes);
  } else if (fPort === 25) {
    data = decodePort25(bytes);
  } else if (fPort === 100 || fPort === 101) {
    data = decodePort100(bytes);
  } else {
    return { data: {}, errors: ["unsupported fPort " + fPort] };
  }
  return { data: data };
}

function encodeDownlink(input) {
  var bytes = [];
  var cmd = input.data || {};
  if (cmd.type === "gnss_log_a") {
    bytes.push(0x0A);
    bytes.push((cmd.year >> 8) & 0xFF);
    bytes.push(cmd.year & 0xFF);
    bytes.push(cmd.month);
    bytes.push(cmd.day);
    bytes.push(cmd.hour);
    bytes.push(cmd.minute);
    bytes.push(cmd.second);
    bytes.push(cmd.count & 0xFF);
  } else if (cmd.type === "gnss_log_b") {
    bytes.push(0x0B);
    bytes.push(cmd.count & 0xFF);
  } else if (cmd.type === "read") {
    var addrs = cmd.addresses || [];
    for (var i = 0; i < addrs.length; i++) {
      bytes.push(addrs[i] & 0x7F);
    }
  } else if (cmd.type === "write") {
    bytes.push((cmd.address | 0x80) & 0xFF);
    var width = cmd.size || registerWidth(cmd.address & 0x7F);
    for (var b = width - 1; b >= 0; b--) {
      bytes.push((cmd.value >> (8 * b)) & 0xFF);
    }
  } else if (cmd.type === "flash_write") {
    var value = 0;
    if (cmd.write_app_config) value |= 0x2000;
    if (cmd.write_loramac_config) value |= 0x4000;
    if (cmd.reboot) value |= 0x0001;
    bytes.push(0x80 | ((value >> 8) & 0x7F));
    bytes.push(value & 0xFF);
  } else if (cmd.type === "factory_reset") {
    bytes.push(0x80 | 0x72);
    bytes.push(cmd.scope === "app" ? 0x0A : (cmd.scope === "loramac" ? 0xB0 : 0xBA));
  }
  return { bytes: bytes, fPort: input.fPort || (cmd.type === "gnss_log_a" || cmd.type === "gnss_log_b" ? 15 : 100) };
}

function decodeDownlink(input) {
  var bytes = input.bytes;
  var fPort = input.fPort;
  var data = {};
  if (fPort === 15) {
    if (bytes.length >= 1 && bytes[0] === 0x0A && bytes.length >= 9) {
      data.type = "gnss_log_a";
      setUtc7(data, "", [bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7]], 0);
      data.count = bytes[8];
    } else if (bytes.length >= 2 && bytes[0] === 0x0B) {
      data.type = "gnss_log_b";
      data.count = bytes[1];
    }
  } else if (fPort === 100) {
    var i = 0;
    while (i < bytes.length) {
      var b = bytes[i];
      if ((b & 0x80) !== 0) {
        var addr = b & 0x7F;
        var width = registerWidth(addr);
        data["write_0x" + toHexUpper([addr])] = 0;
        var v = 0;
        for (var k = 0; k < width && i + 1 + k < bytes.length; k++) {
          v = v * 256 + bytes[i + 1 + k];
        }
        data["write_0x" + toHexUpper([addr])] = v >>> 0;
        i += 1 + width;
      } else {
        data["read_0x" + toHexUpper([b])] = true;
        i += 1;
      }
    }
  }
  return { data: data };
}

module.exports = {
  decodeUplink: decodeUplink,
  encodeDownlink: encodeDownlink,
  decodeDownlink: decodeDownlink
};
