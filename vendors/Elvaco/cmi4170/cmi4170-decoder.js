var JSON_FORMAT_ID = 0x26;
var CLOCK_FORMAT_ID = 0xFA;
var COMBINED_FORMAT_ID = 0x29;
var ENGELMANN_T1_FORMAT_ID = 0x2C;
var ENGELMANN_T2_FORMAT_ID = 0x2D;
var MBUS_FORMAT_IDS = [0x24, 0x25, 0x27, 0x28, 0x29, 0x2C, 0x2D];

var ENERGY_FACTORS = {
  0x00: 0.000001, 0x01: 0.00001, 0x02: 0.0001, 0x03: 0.001,
  0x04: 0.01, 0x05: 0.1, 0x06: 1, 0x07: 10,
  0x0E: 1 / 3.6, 0x0F: 10 / 3.6
};
var MCAL_FACTORS = { 0x0D: 4.1868 / 3.6, 0x0E: 41.868 / 3.6, 0x0F: 418.68 / 3.6 };
var EXTENDED_ENERGY_FACTORS = { 0x06: 1, 0x0E: 1 / 3.6 };
var MMBTU_FACTOR = 1055.05585262 / 3600;
var VOLUME_FACTORS = {
  0x11: 0.00001, 0x12: 0.0001, 0x13: 0.001, 0x14: 0.01,
  0x15: 0.1, 0x16: 1, 0x17: 10
};
var POWER_FACTORS_KW = { 0x2B: 0.001, 0x2C: 0.01, 0x2D: 0.1, 0x2E: 1, 0x2F: 10 };
var FLOW_FACTORS = { 0x3B: 0.001, 0x3C: 0.01, 0x3D: 0.1, 0x3E: 1, 0x3F: 10 };
var FORWARD_TEMPERATURE_FACTORS = { 0x58: 0.001, 0x59: 0.01, 0x5A: 0.1, 0x5B: 1 };
var RETURN_TEMPERATURE_FACTORS = { 0x5C: 0.001, 0x5D: 0.01, 0x5E: 0.1, 0x5F: 1 };
var PULSE_VOLUME_FACTORS = { 0x13: 0.001, 0x14: 0.01, 0x15: 0.1 };
var PULSE_ENERGY_FACTORS = { 0x06: 1, 0x07: 10 };

var DATA_LENGTHS = [0, 1, 2, 3, 4, 4, 6, 8];

function hasFactor(table, key) {
  return Object.prototype.hasOwnProperty.call(table, key);
}

function readUintLE(bytes, offset, length) {
  var value = 0;
  for (var i = length - 1; i >= 0; i--) {
    value = value * 256 + bytes[offset + i];
  }
  return value;
}

function readIntLE(bytes, offset, length) {
  var value = readUintLE(bytes, offset, length);
  if ((bytes[offset + length - 1] & 0x80) !== 0) {
    value -= Math.pow(2, length * 8);
  }
  return value;
}

function readBcdLE(bytes, offset, length) {
  var value = 0;
  for (var i = length - 1; i >= 0; i--) {
    var high = (bytes[offset + i] >> 4) & 0x0F;
    var low = bytes[offset + i] & 0x0F;
    if (high > 9 || low > 9) {
      return null;
    }
    value = value * 100 + high * 10 + low;
  }
  return value;
}

function cleanNumber(value) {
  if (!isFinite(value) || Math.abs(value) >= 1e9) {
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
  var year = 2000 + (raw >>> 28) * 8 + ((raw >>> 21) & 0x07);
  var month = (raw >>> 24) & 0x0F;
  var day = (raw >>> 16) & 0x1F;
  var hour = (raw >>> 8) & 0x1F;
  var minute = raw & 0x3F;
  return padNumber(year, 4) + "-" + padNumber(month, 2) + "-" +
    padNumber(day, 2) + " " + padNumber(hour, 2) + ":" + padNumber(minute, 2);
}

function extendedEnergyFactor(vif, vifes) {
  if (vifes.length === 0 && hasFactor(EXTENDED_ENERGY_FACTORS, vif)) {
    return EXTENDED_ENERGY_FACTORS[vif];
  }
  if (vifes.length === 1 && vif === 0xFB && vifes[0] === 0x0D) {
    return MCAL_FACTORS[0x0D];
  }
  if (vifes.length === 1 && vif === 0x86 && vifes[0] === 0x3D) {
    return MMBTU_FACTOR;
  }
  return null;
}

function pulseInputField(difes, vif, vifes, dataLen) {
  if (dataLen !== 4) {
    return null;
  }
  var number = 0;
  if (difes.length === 1 && difes[0] === 0x40) {
    number = 1;
  } else if (difes.length === 2 && difes[0] === 0x80 && difes[1] === 0x40) {
    number = 2;
  } else if (difes.length === 2 && difes[0] === 0xC0 && difes[1] === 0x40) {
    number = 3;
  } else {
    return null;
  }
  if (vifes.length === 0 && hasFactor(PULSE_VOLUME_FACTORS, vif)) {
    return { kind: "uint", key: "pulse_input_" + number + "_m3", factor: PULSE_VOLUME_FACTORS[vif] };
  }
  if (vifes.length === 0 && hasFactor(PULSE_ENERGY_FACTORS, vif)) {
    return { kind: "uint", key: "pulse_input_" + number + "_kwh", factor: PULSE_ENERGY_FACTORS[vif] };
  }
  if (vif === 0xFD && vifes.length === 1 && vifes[0] === 0x3A) {
    return { kind: "uint", key: "pulse_input_" + number + "_count", factor: 1 };
  }
  return null;
}

function resolveField(formatId, dif, difes, vif, vifes, dataLen, lenNibble) {
  if (vif === 0x6D && dataLen === 4) {
    return { kind: "datetime" };
  }
  if (lenNibble === 0x0C && vif === 0x78 && dataLen === 4) {
    return { kind: "bcd", key: "meter_id" };
  }
  if (vif === 0xFD && vifes.length === 1 && vifes[0] === 0x17) {
    return { kind: "uint", key: "error_flags", factor: 1 };
  }
  if (difes.length > 0) {
    if (difes.length === 1 && difes[0] === 0x10 && dataLen === 4) {
      var coolingFactor = extendedEnergyFactor(vif, vifes);
      if (coolingFactor !== null) {
        return { kind: "uint", key: "cooling_energy", factor: coolingFactor };
      }
    }
    return pulseInputField(difes, vif, vifes, dataLen);
  }
  if ((dif & 0x40) !== 0 && dataLen === 4) {
    var accFactor = extendedEnergyFactor(vif, vifes);
    if (accFactor !== null) {
      return { kind: "uint", key: "accumulated_energy_at_2400", factor: accFactor };
    }
    return null;
  }
  if (dataLen === 4 && vifes.length === 0 && hasFactor(ENERGY_FACTORS, vif)) {
    var energyKey = formatId === COMBINED_FORMAT_ID ? "heat_energy" : "energy";
    return { kind: "uint", key: energyKey, factor: ENERGY_FACTORS[vif] };
  }
  if (dataLen === 4 && vif === 0xFB && vifes.length === 1 && hasFactor(MCAL_FACTORS, vifes[0])) {
    var mcalKey = formatId === COMBINED_FORMAT_ID ? "heat_energy" : "energy";
    return { kind: "uint", key: mcalKey, factor: MCAL_FACTORS[vifes[0]] };
  }
  if (dataLen === 4 && vifes.length === 0 && hasFactor(VOLUME_FACTORS, vif)) {
    return { kind: "uint", key: "volume", factor: VOLUME_FACTORS[vif] };
  }
  if (dataLen === 2 && vifes.length === 0 && hasFactor(POWER_FACTORS_KW, vif)) {
    return { kind: "int", key: "power", factor: POWER_FACTORS_KW[vif] };
  }
  if (dataLen === 2 && vifes.length === 0 && hasFactor(FLOW_FACTORS, vif)) {
    return { kind: "uint", key: "flow", factor: FLOW_FACTORS[vif] };
  }
  if (dataLen === 2 && vifes.length === 0 && hasFactor(FORWARD_TEMPERATURE_FACTORS, vif)) {
    return { kind: "int", key: "forward_temperature", factor: FORWARD_TEMPERATURE_FACTORS[vif] };
  }
  if (dataLen === 2 && vifes.length === 0 && hasFactor(RETURN_TEMPERATURE_FACTORS, vif)) {
    return { kind: "int", key: "return_temperature", factor: RETURN_TEMPERATURE_FACTORS[vif] };
  }
  return null;
}

function applyCompressedBlockA(bytes, offset, scaling, errorState, data, prefix) {
  if (errorState) {
    data[prefix + "forward_temperature"] = null;
    data[prefix + "return_temperature"] = null;
    data[prefix + "flow"] = null;
    data[prefix + "power"] = null;
    return;
  }
  var powerExponent = ((scaling >> 4) & 0x07) - 3;
  var flowExponent = (scaling & 0x07) - 3;
  data[prefix + "forward_temperature"] = cleanNumber(readIntLE(bytes, offset, 2) * 0.01);
  data[prefix + "return_temperature"] = cleanNumber(readIntLE(bytes, offset + 2, 2) * 0.01);
  data[prefix + "flow"] = cleanNumber(readUintLE(bytes, offset + 4, 2) * Math.pow(10, flowExponent));
  data[prefix + "power"] = cleanNumber(readUintLE(bytes, offset + 6, 2) * Math.pow(10, powerExponent) / 1000);
}

function applyCompressedBlockB(bytes, offset, errorState, data, prefix) {
  if (errorState) {
    data[prefix + "info_bits"] = null;
    data[prefix + "meter_id"] = null;
    return;
  }
  data[prefix + "info_bits"] = readUintLE(bytes, offset, 2);
  data[prefix + "meter_id"] = readUintLE(bytes, offset + 2, 4);
}

function parseMbusFrame(formatId, bytes, prefix) {
  var data = {};
  var offset = 1;
  while (offset < bytes.length) {
    var dif = bytes[offset];
    offset += 1;
    var errorState = (dif & 0x30) === 0x30;
    var lenNibble = dif & 0x0F;
    if (lenNibble === 0x0E || lenNibble === 0x0F) {
      return data;
    }
    if (lenNibble === 0x0D) {
      if (offset >= bytes.length) {
        return data;
      }
      var lenu = bytes[offset];
      offset += 1;
      var lenuFactor = 1;
      if (lenu === 0xFB || lenu === 0xFD) {
        if (offset >= bytes.length) {
          return data;
        }
        lenuFactor = lenu === 0xFB ? 10 : 100;
        lenu = bytes[offset];
        offset += 1;
      }
      offset += lenu * lenuFactor;
      continue;
    }
    var dataLen = DATA_LENGTHS[dif & 0x07];
    if (dataLen === 0) {
      return data;
    }
    var difes = [];
    if ((dif & 0x80) !== 0) {
      var dife = 0;
      do {
        if (offset >= bytes.length || difes.length >= 10) {
          return data;
        }
        dife = bytes[offset];
        offset += 1;
        difes.push(dife);
      } while ((dife & 0x80) !== 0);
    }
    if (offset >= bytes.length) {
      return data;
    }
    var vif = bytes[offset];
    offset += 1;
    var vifes = [];
    if ((vif & 0x80) !== 0) {
      var vife = 0;
      do {
        if (offset >= bytes.length || vifes.length >= 10) {
          return data;
        }
        vife = bytes[offset];
        offset += 1;
        vifes.push(vife);
      } while ((vife & 0x80) !== 0);
    }
    if ((dif & 0x07) === 0x07 && vif === 0xFF && vifes.length >= 1 &&
        vifes.length <= 2 && vifes[0] === 0xA0) {
      var scaling = vifes.length === 2 ? vifes[1] : bytes[offset];
      var blockStart = vifes.length === 2 ? offset : offset + 1;
      if (blockStart + 8 > bytes.length) {
        return data;
      }
      applyCompressedBlockA(bytes, blockStart, scaling, errorState, data, prefix);
      offset = blockStart + 8;
      continue;
    }
    if ((dif & 0x07) === 0x06 && vif === 0xFF && vifes.length === 1 &&
        vifes[0] === 0x21) {
      if (offset + 6 > bytes.length) {
        return data;
      }
      applyCompressedBlockB(bytes, offset, errorState, data, prefix);
      offset += 6;
      continue;
    }
    var field = resolveField(formatId, dif, difes, vif, vifes, dataLen, lenNibble);
    if (field === null) {
      offset += dataLen;
      continue;
    }
    if (offset + dataLen > bytes.length) {
      return data;
    }
    if (field.kind === "datetime") {
      var dateKey = formatId === CLOCK_FORMAT_ID ? "date_time" : prefix + "meter_date_time";
      var raw = readUintLE(bytes, offset, 4);
      var valid = !errorState && (raw & 0x80) === 0;
      data[dateKey] = valid ? formatDateTime(raw) : null;
      data[dateKey + "_valid"] = valid;
    } else if (errorState) {
      data[prefix + field.key] = null;
    } else if (field.kind === "bcd") {
      data[prefix + field.key] = readBcdLE(bytes, offset, dataLen);
    } else if (field.kind === "int") {
      data[prefix + field.key] = cleanNumber(readIntLE(bytes, offset, dataLen) * field.factor);
    } else {
      data[prefix + field.key] = cleanNumber(readUintLE(bytes, offset, dataLen) * field.factor);
    }
    offset += dataLen;
  }
  return data;
}

function jsonKeyName(key) {
  if (key === "E") {
    return "energy";
  }
  if (key === "U") {
    return "unit";
  }
  if (key === "ID") {
    return "meter_id";
  }
  var name = key.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  name = name.replace(/^_+/, "").replace(/_+$/, "");
  return name === "" ? "field" : name;
}

function parseJsonFrame(bytes, start) {
  var text = "";
  for (var i = start; i < bytes.length; i++) {
    if (bytes[i] === 0x00) {
      break;
    }
    text += String.fromCharCode(bytes[i]);
  }
  text = text.replace(/^[\s\uFEFF]+/, "").replace(/[\s\uFEFF]+$/, "");
  try {
    var parsed = JSON.parse(text);
    if (parsed !== null && typeof parsed === "object" &&
        Object.prototype.toString.call(parsed) !== "[object Array]") {
      var data = {};
      for (var key in parsed) {
        if (Object.prototype.hasOwnProperty.call(parsed, key)) {
          data[jsonKeyName(key)] = parsed[key];
        }
      }
      return data;
    }
  } catch (err) {}
  return { json_raw: text };
}

function formatPrefix(formatId) {
  if (formatId === ENGELMANN_T1_FORMAT_ID) {
    return "t1_";
  }
  if (formatId === ENGELMANN_T2_FORMAT_ID) {
    return "t2_";
  }
  return "";
}

function decodePayload(bytes) {
  var formatId = bytes[0];
  if (formatId === JSON_FORMAT_ID) {
    return parseJsonFrame(bytes, 1);
  }
  if (bytes[0] === 0x7B) {
    return parseJsonFrame(bytes, 0);
  }
  if (formatId === CLOCK_FORMAT_ID || MBUS_FORMAT_IDS.indexOf(formatId) !== -1) {
    return parseMbusFrame(formatId, bytes, formatPrefix(formatId));
  }
  return {};
}

function decodeUplink(input) {
  var bytes = input && input.bytes ? input.bytes : [];
  var port = input ? input.fPort : undefined;
  var data = {};
  if (bytes.length > 0 && (port === undefined || port === null || port !== port ||
      Number(port) === 2)) {
    data = decodePayload(bytes);
  }
  return { data: data };
}

function Decode(fPort, bytes, variables) {
  return decodeUplink({ bytes: bytes, fPort: fPort });
}

function Decoder(bytes, fPort) {
  return decodeUplink({ bytes: bytes, fPort: fPort });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { decodeUplink: decodeUplink, Decode: Decode, Decoder: Decoder };
}
