var UPLINK_TYPE_NAMES = {
  0x01: "Data",
  0x02: "Command NACK"
};

var DOWNLINK_TYPE_NAMES = {
  0x01: "Set",
  0x02: "Query",
  0x03: "Action"
};

var INDEX_NAMES = {
  0x03: "FW build hash",
  0x05: "Device reset",
  0x06: "CPU voltage",
  0x0A: "CPU temperature",
  0x20: "Status",
  0x30: "Measurement interval",
  0x31: "Measurement cycles per reporting event",
  0x32: "CO2 concentration variation threshold",
  0x33: "CO2 concentration absolute threshold",
  0x34: "Internal CO2 sensor status bits"
};

function hexToBytes(hex) {
  var clean = String(hex).replace(/[^0-9a-fA-F]/g, "");
  var bytes = [];
  for (var i = 0; i + 1 < clean.length; i += 2) {
    bytes.push(parseInt(clean.substr(i, 2), 16));
  }
  return bytes;
}

function bytesToHexStr(bytes) {
  var parts = [];
  for (var i = 0; i < bytes.length; i++) {
    parts.push(("0" + bytes[i].toString(16)).slice(-2));
  }
  return parts.join("");
}

function readBytes(input) {
  if (!input) {
    return [];
  }
  if (input.bytes) {
    if (typeof input.bytes === "string") {
      return hexToBytes(input.bytes);
    }
    return input.bytes;
  }
  if (typeof input.data === "string") {
    return hexToBytes(input.data);
  }
  return [];
}

function indexName(index) {
  return INDEX_NAMES[index] !== undefined ? INDEX_NAMES[index] : "Unknown";
}

function decodeQueryData(out, index, data) {
  if (index === 0x20) {
    if (data.length >= 1) {
      out.status = data[0];
    }
    return;
  }
  if (index === 0x03) {
    if (data.length >= 6) {
      out.fw_build_hash = bytesToHexStr(data.slice(0, 6));
    }
    return;
  }
  if (index === 0x06) {
    if (data.length >= 1) {
      out.cpu_voltage = data[0] * 0.025;
    }
    return;
  }
  if (index === 0x0A) {
    if (data.length >= 2) {
      out.cpu_temperature = (((data[0] << 8) | data[1]) / 100) - 50;
    }
    return;
  }
  if (index === 0x30) {
    if (data.length >= 2) {
      out.measurement_interval = (data[0] << 8) | data[1];
    }
    return;
  }
  if (index === 0x31) {
    if (data.length >= 2) {
      out.measurement_cycles_per_report = (data[0] << 8) | data[1];
    }
    return;
  }
  if (index === 0x32) {
    if (data.length >= 2) {
      out.co2_variation_threshold = (data[0] << 8) | data[1];
    }
    return;
  }
  if (index === 0x33) {
    if (data.length >= 2) {
      out.co2_absolute_threshold = (data[0] << 8) | data[1];
    }
    return;
  }
  if (index === 0x34) {
    if (data.length >= 4) {
      out.co2_sensor_status = (((data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3]) >>> 0);
    }
    return;
  }
  if (data.length > 0) {
    out.data_hex = bytesToHexStr(data);
  }
}

function decodePort1(bytes) {
  var out = {};
  if (bytes.length < 2) {
    if (bytes.length > 0) {
      out.raw_hex = bytesToHexStr(bytes);
    }
    return out;
  }
  var type = bytes[0];
  var index = bytes[1];
  if (type === 0x01) {
    out.type = "Data";
    out.index = indexName(index);
    decodeQueryData(out, index, bytes.slice(2));
  } else if (type === 0x02) {
    out.type = "Command NACK";
    out.index = indexName(index);
    out.nack = 1;
  } else {
    out.type = type;
    out.index = index;
    out.raw_hex = bytesToHexStr(bytes);
  }
  return out;
}

function decodePort2(bytes) {
  var out = {};
  if (bytes.length >= 3) {
    var rawTemperature = (bytes[0] << 4) | (bytes[2] >> 4);
    var rawHumidity = (bytes[1] << 4) | (bytes[2] & 0x0F);
    out.temperature = (rawTemperature - 800) / 10;
    out.humidity = (rawHumidity - 250) / 10;
  }
  if (bytes.length >= 5) {
    var co2 = (bytes[3] << 8) | bytes[4];
    out.co2 = co2;
    out.co2_alert = co2 === 0xFFFF ? 1 : 0;
  }
  if (bytes.length < 3 && bytes.length > 0) {
    out.raw_hex = bytesToHexStr(bytes);
  }
  return out;
}

function decodeDownlinkSetValue(out, index, bytes) {
  if (bytes.length < 4) {
    return;
  }
  var value = (bytes[2] << 8) | bytes[3];
  if (index === 0x30) {
    out.measurement_interval = value;
  } else if (index === 0x31) {
    out.measurement_cycles_per_report = value;
  } else if (index === 0x32) {
    out.co2_variation_threshold = value;
  } else if (index === 0x33) {
    out.co2_absolute_threshold = value;
  }
}

function decodeUplink(input, callback) {
  var bytes = readBytes(input);
  var fPort = input && input.fPort !== undefined ? Number(input.fPort) : NaN;
  var out;
  if (fPort === 1) {
    out = decodePort1(bytes);
  } else if (fPort === 2) {
    out = decodePort2(bytes);
  } else {
    out = {};
  }
  var result = { data: out };
  if (callback) {
    callback(result);
  }
  return result;
}

function decodeDownlink(input, callback) {
  var bytes = readBytes(input);
  var out = {};
  if (bytes.length >= 2) {
    var type = bytes[0];
    var index = bytes[1];
    if (type === 0x03 && index === 0x05) {
      out.action = "device reset";
    } else {
      out.type = DOWNLINK_TYPE_NAMES[type] !== undefined ? DOWNLINK_TYPE_NAMES[type] : type;
      out.index = indexName(index);
      if (type === 0x01) {
        decodeDownlinkSetValue(out, index, bytes);
      }
    }
  } else if (bytes.length > 0) {
    out.raw_hex = bytesToHexStr(bytes);
  }
  var result = { data: out };
  if (callback) {
    callback(result);
  }
  return result;
}

function encodeDownlink(input, callback) {
  var fPort = input && input.fPort !== undefined ? input.fPort : 1;
  var bytes = [];
  if (input && input.bytes) {
    bytes = input.bytes;
  } else if (input && typeof input.data === "string") {
    bytes = hexToBytes(input.data);
  }
  var result = { fPort: fPort, bytes: bytes };
  if (callback) {
    callback(result);
  }
  return result;
}

module.exports = {
  decodeUplink: decodeUplink,
  decodeDownlink: decodeDownlink,
  encodeDownlink: encodeDownlink,
  hexToBytes: hexToBytes
};
