// Elvaco CMi4130 LoRaWAN meter module uplink decoder
// Source: CMi4130 User Manual v1.1 [2020-06] section 6.7 (pp. 12-20);
// test vector from the TTN cmi4130 payload codec example.
//
// All uplink messages arrive on fPort 2 (used as default when absent).
// payload[0] selects the message format (manual Table 4):
//   0x0F Standard, 0x10 Compact, 0x11 JSON (ASCII object with keys
//   E energy, U unit, ID meter id), 0x12 Scheduled daily redundant
//   (adds meter date/time and the accumulated energy at 24:00),
//   0x13 Scheduled extended (compressed blocks 07FFA0 power/flow/
//   temperatures and 06FF21 alarm/meter id), 0x14 Combined heat/cooling
//   (cooling energy uses extended VIF 83-8F FF02), 0xFA clock message
//   (046D valid date/time, 346D invalid).
// M-Bus DIBs are parsed in a loop, unknown records are skipped, and DIF
// bits 4-5 set to 11b mark a value captured during error state (null).
// Output units: energy kWh, volume m3, power kW, flow m3/h, temperature
// degC; date/time fields are "YYYY-MM-DD HH:MM" strings plus a _valid
// flag. JSON frames are flattened as energy_e / unit_u / meter_id_id and
// fall back to json_raw when the text cannot be parsed.

var ENERGY_FACTORS = {
  0x03: 0.001,
  0x04: 0.01,
  0x05: 0.1,
  0x06: 1,
  0x07: 10,
  0x0E: 1 / 3.6,
  0x0F: 10 / 3.6
};

var COOLING_FACTORS = {
  0x83: 0.001,
  0x84: 0.01,
  0x85: 0.1,
  0x86: 1,
  0x87: 10,
  0x8E: 1 / 3.6,
  0x8F: 10 / 3.6
};

var VOLUME_FACTORS = {
  0x11: 0.00001,
  0x12: 0.0001,
  0x13: 0.001,
  0x14: 0.01,
  0x15: 0.1,
  0x16: 1,
  0x17: 10
};

var POWER_FACTORS = {
  0x2B: 0.001,
  0x2C: 0.01,
  0x2D: 0.1,
  0x2E: 1,
  0x2F: 10
};

var FLOW_FACTORS = {
  0x3B: 0.001,
  0x3C: 0.01,
  0x3D: 0.1,
  0x3E: 1,
  0x3F: 10
};

var FORWARD_TEMPERATURE_FACTORS = {
  0x58: 0.001,
  0x59: 0.01,
  0x5A: 0.1,
  0x5B: 1
};

var RETURN_TEMPERATURE_FACTORS = {
  0x5C: 0.001,
  0x5D: 0.01,
  0x5E: 0.1,
  0x5F: 1
};

function hasFactor(table, key) {
  return Object.prototype.hasOwnProperty.call(table, key);
}

function readLeUint(bytes, offset, length) {
  var value = 0;
  for (var i = 0; i < length; i++) {
    value += bytes[offset + i] * Math.pow(256, i);
  }
  return value;
}

function cleanNumber(value) {
  if (!isFinite(value)) {
    return value;
  }
  if (Math.abs(value) >= 1e9) {
    return value;
  }
  return Math.round(value * 1e6) / 1e6;
}

function padNumber(value, width) {
  var out = String(value);
  while (out.length < width) {
    out = "0" + out;
  }
  return out;
}

function formatDateTime(raw) {
  var year = ((raw >>> 28) << 3) | ((raw >>> 21) & 0x07);
  var month = (raw >>> 24) & 0x0F;
  var day = (raw >>> 16) & 0x1F;
  var hour = (raw >>> 8) & 0x1F;
  var minute = raw & 0x3F;
  return padNumber(year + 2000, 4) + "-" + padNumber(month, 2) + "-" +
    padNumber(day, 2) + " " + padNumber(hour, 2) + ":" + padNumber(minute, 2);
}

function dataLength(dif) {
  var code = dif & 0x07;
  if (code === 0) {
    return 0;
  }
  if (code === 1) {
    return 1;
  }
  if (code === 2) {
    return 2;
  }
  if (code === 3 || code === 4) {
    return 4;
  }
  if (code === 5) {
    return 6;
  }
  if (code === 6) {
    return 8;
  }
  return -1;
}

function storeNumber(data, key, errState, value) {
  data[key] = errState ? null : cleanNumber(value);
}

function applyDib(bytes, offset, length, dif, vif, vifes, errState, data, opts) {
  if (vif === 0x6D && length === 4) {
    data[opts.dateKey] = formatDateTime(readLeUint(bytes, offset, 4));
    data[opts.dateKey + "_valid"] = !errState;
    return;
  }
  if ((dif & 0xCF) === 0x0C && vif === 0x78 && length === 4) {
    storeNumber(data, "meter_id", errState, readLeUint(bytes, offset, 4));
    return;
  }
  if (vifes.length === 0) {
    if (length === 4 && hasFactor(ENERGY_FACTORS, vif)) {
      var energyKey = opts.energyKey;
      if (data[energyKey] !== undefined && opts.secondEnergyKey) {
        energyKey = opts.secondEnergyKey;
      }
      storeNumber(data, energyKey, errState,
        readLeUint(bytes, offset, 4) * ENERGY_FACTORS[vif]);
      return;
    }
    if (length === 4 && hasFactor(VOLUME_FACTORS, vif)) {
      storeNumber(data, "volume", errState,
        readLeUint(bytes, offset, 4) * VOLUME_FACTORS[vif]);
      return;
    }
    if (length === 2 && hasFactor(POWER_FACTORS, vif)) {
      storeNumber(data, "power", errState,
        readLeUint(bytes, offset, 2) * POWER_FACTORS[vif]);
      return;
    }
    if (length === 2 && hasFactor(FLOW_FACTORS, vif)) {
      storeNumber(data, "flow", errState,
        readLeUint(bytes, offset, 2) * FLOW_FACTORS[vif]);
      return;
    }
    if (length === 2 && hasFactor(FORWARD_TEMPERATURE_FACTORS, vif)) {
      storeNumber(data, "forward_temperature", errState,
        readLeUint(bytes, offset, 2) * FORWARD_TEMPERATURE_FACTORS[vif]);
      return;
    }
    if (length === 2 && hasFactor(RETURN_TEMPERATURE_FACTORS, vif)) {
      storeNumber(data, "return_temperature", errState,
        readLeUint(bytes, offset, 2) * RETURN_TEMPERATURE_FACTORS[vif]);
      return;
    }
    return;
  }
  if (vif === 0xFD && vifes.length === 1 && vifes[0] === 0x17 && length === 2) {
    storeNumber(data, "alarm_codes", errState, readLeUint(bytes, offset, 2));
    return;
  }
  if (vifes.length === 2 && vifes[0] === 0xFF && vifes[1] === 0x02 &&
      length === 4 && hasFactor(COOLING_FACTORS, vif)) {
    storeNumber(data, "cooling_energy", errState,
      readLeUint(bytes, offset, 4) * COOLING_FACTORS[vif]);
  }
}

function decodeDibs(bytes, data, opts) {
  var i = 1;
  var end = bytes.length;
  while (i < end) {
    var dif = bytes[i];
    i += 1;
    if (dif & 0x80) {
      var dife;
      do {
        if (i >= end) {
          return;
        }
        dife = bytes[i];
        i += 1;
      } while (dife & 0x80);
    }
    var errState = ((dif >> 4) & 0x03) === 0x03;
    if (i >= end) {
      return;
    }
    var vif = bytes[i];
    i += 1;
    var vifes = [];
    if (vif & 0x80) {
      var vife;
      do {
        if (i >= end) {
          return;
        }
        vife = bytes[i];
        i += 1;
        vifes.push(vife);
      } while (vife & 0x80);
    }
    if ((dif & 0x0F) === 0x07 && vif === 0xFF && vifes.length >= 1 &&
        vifes.length <= 2 && vifes[0] === 0xA0) {
      var dataStart = vifes.length === 2 ? i : i + 1;
      var scale = vifes.length === 2 ? vifes[1] : bytes[i];
      if (dataStart + 8 > end) {
        return;
      }
      var powerExponent = (scale >> 4) & 0x07;
      var flowExponent = scale & 0x07;
      storeNumber(data, "forward_temperature", errState,
        readLeUint(bytes, dataStart, 2) * 0.01);
      storeNumber(data, "return_temperature", errState,
        readLeUint(bytes, dataStart + 2, 2) * 0.01);
      storeNumber(data, "flow", errState,
        readLeUint(bytes, dataStart + 4, 2) * Math.pow(10, flowExponent - 3));
      storeNumber(data, "power", errState,
        readLeUint(bytes, dataStart + 6, 2) * Math.pow(10, powerExponent - 3) / 1000);
      i = dataStart + 8;
      continue;
    }
    if ((dif & 0x0F) === 0x06 && vif === 0xFF && vifes.length === 1 &&
        vifes[0] === 0x21) {
      if (i + 6 > end) {
        return;
      }
      storeNumber(data, "alarm_codes", errState, readLeUint(bytes, i, 2));
      storeNumber(data, "meter_id", errState, readLeUint(bytes, i + 2, 4));
      i += 6;
      continue;
    }
    var length = dataLength(dif);
    if (length < 0) {
      if (i >= end) {
        return;
      }
      var lenu = bytes[i];
      i += 1;
      var lenuFactor = 1;
      if (lenu === 0xFB || lenu === 0xFD) {
        lenuFactor = lenu === 0xFB ? 10 : 100;
        if (i >= end) {
          return;
        }
        lenu = bytes[i];
        i += 1;
      }
      length = lenu * lenuFactor;
    }
    if (i + length > end) {
      return;
    }
    applyDib(bytes, i, length, dif, vif, vifes, errState, data, opts);
    i += length;
  }
}

function jsonKeyName(key) {
  if (key === "E") {
    return "energy_e";
  }
  if (key === "U") {
    return "unit_u";
  }
  if (key === "ID") {
    return "meter_id_id";
  }
  var name = key.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  name = name.replace(/^_+/, "").replace(/_+$/, "");
  return name === "" ? "field" : name;
}

function flattenJson(value, prefix, data) {
  if (value === null || typeof value !== "object") {
    data[prefix] = value;
    return;
  }
  if (Object.prototype.toString.call(value) === "[object Array]") {
    data[prefix] = value;
    return;
  }
  for (var key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      continue;
    }
    var name = prefix === "" ? jsonKeyName(key) : prefix + "_" + jsonKeyName(key);
    flattenJson(value[key], name, data);
  }
}

function decodeJsonFrame(bytes, data) {
  var text = "";
  for (var i = 1; i < bytes.length; i++) {
    text += String.fromCharCode(bytes[i]);
  }
  text = text.replace(/^[\s\uFEFF]+/, "");
  try {
    var parsed = JSON.parse(text);
    if (parsed === null || typeof parsed !== "object" ||
        Object.prototype.toString.call(parsed) === "[object Array]") {
      data.json_raw = text;
      return;
    }
    flattenJson(parsed, "", data);
  } catch (e) {
    data.json_raw = text;
  }
}

function decodeFrame(bytes, data) {
  var format = bytes[0];
  if (format === 0x11) {
    decodeJsonFrame(bytes, data);
    return;
  }
  var opts = {
    energyKey: "energy",
    secondEnergyKey: null,
    dateKey: "meter_date_time"
  };
  if (format === 0x14) {
    opts.energyKey = "heat_energy";
  } else if (format === 0x12) {
    opts.secondEnergyKey = "accumulated_energy_at_2400";
  } else if (format === 0xFA) {
    opts.dateKey = "date_time";
  }
  decodeDibs(bytes, data, opts);
}

function decodeUplink(input) {
  var bytes = input && input.bytes ? input.bytes : null;
  var port = input ? input.fPort : undefined;
  if (typeof port === "undefined" || port === null || port !== port) {
    port = 2;
  }
  var data = {};
  if (bytes && bytes.length && Number(port) === 2) {
    decodeFrame(bytes, data);
  }
  return { data: data };
}

function Decode(fPort, bytes) {
  return decodeUplink({ bytes: bytes, fPort: fPort });
}

function Decoder(bytes, fPort) {
  return decodeUplink({ bytes: bytes, fPort: fPort });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    decodeUplink: decodeUplink,
    Decode: Decode,
    Decoder: Decoder
  };
}
