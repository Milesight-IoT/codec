// Elvaco CMi4160 LoRaWAN meter module (Diehl SHARKY 775) uplink decoder.
// Source: CMi4160 User Manual 2021-02 message format tables and the TTN
// cmi4160 payload codec example. Uplinks arrive on fPort 2 (used as
// default when absent); payload[0] selects the message format: 0x1E
// Standard, 0x1F Compact, 0x20 JSON (ASCII object with keys E energy,
// U unit, ID meter id), 0x21 Scheduled-daily redundant (adds meter
// date/time and the accumulated energy at 24:00, DIF 0x44 series),
// 0x22 Scheduled-extended (compressed block 07FFA0 with temperatures/
// flow/power and identification block 0DFF21E9 with error flags/meter
// id), 0x23 Combined heat/cooling (cooling energy VIF 0x8x with FF02
// suffix, return temperature VIF 0x5E only), 0xFA clock message (046D
// valid date/time, 346D invalid). M-Bus EN 13757-3 DIBs are parsed in
// a loop, unknown records are skipped and DIF bits 4-5 set to 11b mark
// a value captured during error state (null). Output units: energy in
// kWh, volume m3, power kW, flow m3/h, temperatures degC; meter id key
// serial and error/warning flags key error_flag, aligned with the
// Elvaco family codec output.

var ENERGY_KWH = {
  0x03: 0.001, 0x04: 0.01, 0x05: 0.1, 0x06: 1, 0x07: 10,
  0x0E: 1 / 3.6, 0x0F: 10 / 3.6
};
var MCAL_KWH = { 0x0D: 1.163, 0x0E: 11.63, 0x0F: 116.3 };
var COOLING_KWH = {
  0x83: 0.001, 0x84: 0.01, 0x85: 0.1, 0x86: 1, 0x87: 10,
  0x8E: 1 / 3.6, 0x8F: 10 / 3.6
};
var COOLING_MCAL_KWH = { 0x8D: 1.163, 0x8E: 11.63, 0x8F: 116.3 };
var VOLUME_M3 = { 0x13: 0.001, 0x14: 0.01, 0x15: 0.1, 0x16: 1, 0x17: 10 };
var POWER_KW = { 0x2B: 0.001, 0x2C: 0.01, 0x2D: 0.1, 0x2E: 1, 0x2F: 10 };
var FLOW_M3H = { 0x3B: 0.001, 0x3C: 0.01, 0x3D: 0.1, 0x3E: 1, 0x3F: 10 };
var FLOW_TEMPERATURE_C = { 0x58: 0.001, 0x59: 0.01, 0x5A: 0.1, 0x5B: 1 };
var RETURN_TEMPERATURE_C = { 0x5C: 0.001, 0x5D: 0.01, 0x5E: 0.1, 0x5F: 1 };

function hasKey(table, key) {
  return Object.prototype.hasOwnProperty.call(table, key);
}

function readLeUint(bytes, offset, length) {
  var value = 0;
  for (var i = 0; i < length; i++) {
    value += bytes[offset + i] * Math.pow(256, i);
  }
  return value;
}

function readInt16(bytes, offset) {
  var value = bytes[offset] | (bytes[offset + 1] << 8);
  return value > 32767 ? value - 65536 : value;
}

function readInt32(bytes, offset) {
  var value = readLeUint(bytes, offset, 4);
  return value > 2147483647 ? value - 4294967296 : value;
}

function readReversedBcd(bytes, offset, length) {
  var text = "";
  for (var i = length - 1; i >= 0; i--) {
    var hi = (bytes[offset + i] >> 4) & 0x0F;
    var lo = bytes[offset + i] & 0x0F;
    if (hi > 9 || lo > 9) {
      return null;
    }
    text += String.fromCharCode(48 + hi, 48 + lo);
  }
  var value = parseInt(text, 10);
  return isNaN(value) ? null : value;
}

function cleanNumber(value) {
  if (!isFinite(value) || Math.abs(value) >= 1e9) {
    return value;
  }
  return Math.round(value * 1e6) / 1e6;
}

function store(data, key, errState, value) {
  data[key] = errState ? null : cleanNumber(value);
}

function storeEnergy(data, opts, dif, errState, value) {
  var key = dif & 0x40 ? "accumulated_energy_at_2400" : opts.energyKey;
  store(data, opts.prefix + key, errState, value);
}

function padNumber(value, width) {
  var out = String(value);
  while (out.length < width) {
    out = "0" + out;
  }
  return out;
}

function formatDateTime(raw) {
  var year = (((raw >>> 28) << 3) | ((raw >>> 21) & 0x07)) + 2000;
  var month = (raw >>> 24) & 0x0F;
  var day = (raw >>> 16) & 0x1F;
  var hour = (raw >>> 8) & 0x1F;
  var minute = raw & 0x3F;
  return padNumber(year, 4) + "-" + padNumber(month, 2) + "-" +
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

function isExtIdVifes(vifes, next) {
  if (vifes.length === 1 && vifes[0] === 0x21 && next === 0xE9) {
    return true;
  }
  return vifes.length === 2 && vifes[0] === 0xE9 && vifes[1] === 0x21;
}

function applyDib(bytes, offset, length, dif, difes, vif, vifes, errState, data, opts) {
  var prefix = opts.prefix;
  if (difes.length > 0) {
    return;
  }
  if (vif === 0x6D && length === 4) {
    var stamp = readLeUint(bytes, offset, 4);
    data[prefix + opts.dateKey] = formatDateTime(stamp);
    data[prefix + opts.dateKey + "_valid"] = !errState && ((stamp >>> 7) & 1) === 0;
    return;
  }
  if (vif === 0xFD && vifes.length === 1 && vifes[0] === 0x17 && length === 1) {
    store(data, prefix + "error_flag", errState, readLeUint(bytes, offset, 1));
    return;
  }
  if (vifes.length === 0 && length === 4 && hasKey(ENERGY_KWH, vif)) {
    storeEnergy(data, opts, dif, errState, readInt32(bytes, offset) * ENERGY_KWH[vif]);
    return;
  }
  if (vifes.length === 0 && length === 4 && hasKey(VOLUME_M3, vif)) {
    store(data, prefix + "volume", errState, readInt32(bytes, offset) * VOLUME_M3[vif]);
    return;
  }
  if (length === 4 && vifes.length === 2 && vifes[0] === 0xFF && vifes[1] === 0x02 &&
      hasKey(COOLING_KWH, vif)) {
    store(data, prefix + "cooling_energy", errState,
      readInt32(bytes, offset) * COOLING_KWH[vif]);
    return;
  }
  if (vif === 0xFB && length === 4 && vifes.length === 1 && hasKey(MCAL_KWH, vifes[0])) {
    storeEnergy(data, opts, dif, errState, readInt32(bytes, offset) * MCAL_KWH[vifes[0]]);
    return;
  }
  if (vif === 0xFB && length === 4 && vifes.length === 3 && vifes[1] === 0xFF &&
      vifes[2] === 0x02 && hasKey(COOLING_MCAL_KWH, vifes[0])) {
    store(data, prefix + "cooling_energy", errState,
      readInt32(bytes, offset) * COOLING_MCAL_KWH[vifes[0]]);
    return;
  }
  if (vifes.length === 0 && length === 2 && hasKey(POWER_KW, vif)) {
    store(data, prefix + "power", errState, readInt16(bytes, offset) * POWER_KW[vif]);
    return;
  }
  if (vifes.length === 0 && length === 2 && hasKey(FLOW_M3H, vif)) {
    store(data, prefix + "flow", errState, readInt16(bytes, offset) * FLOW_M3H[vif]);
    return;
  }
  if (vifes.length === 0 && length === 2 && hasKey(FLOW_TEMPERATURE_C, vif)) {
    store(data, prefix + "flow_temperature", errState,
      readInt16(bytes, offset) * FLOW_TEMPERATURE_C[vif]);
    return;
  }
  if (vifes.length === 0 && length === 2 && hasKey(opts.returnTempTable, vif)) {
    store(data, prefix + "return_temperature", errState,
      readInt16(bytes, offset) * opts.returnTempTable[vif]);
  }
}

function walkDibs(bytes, data, opts) {
  var i = 1;
  var end = bytes.length;
  while (i < end) {
    var dif = bytes[i];
    i += 1;
    var difes = [];
    if (dif & 0x80) {
      var dife;
      do {
        if (i >= end) {
          return;
        }
        dife = bytes[i];
        i += 1;
        difes.push(dife);
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
    if ((dif & 0x0F) === 0x07 && difes.length === 0 && vif === 0x79 && vifes.length === 0) {
      if (i + 8 > end) {
        return;
      }
      var serial = readReversedBcd(bytes, i, 4);
      store(data, opts.prefix + "serial", errState,
        serial === null ? readLeUint(bytes, i, 4) : serial);
      i += 8;
      continue;
    }
    if ((dif & 0x0F) === 0x07 && difes.length === 0 && vif === 0xFF && vifes.length === 2 &&
        vifes[0] === 0xA0 && (vifes[1] & 0x80) === 0) {
      if (i + 8 > end) {
        return;
      }
      store(data, opts.prefix + "flow_temperature", errState, readInt16(bytes, i) * 0.01);
      store(data, opts.prefix + "return_temperature", errState,
        readInt16(bytes, i + 2) * 0.01);
      store(data, opts.prefix + "flow", errState,
        readInt16(bytes, i + 4) * Math.pow(10, (vifes[1] & 0x07) - 6));
      store(data, opts.prefix + "power", errState,
        readInt16(bytes, i + 6) * Math.pow(10, ((vifes[1] >> 4) & 0x07) - 3) / 1000);
      i += 8;
      continue;
    }
    if ((dif & 0x0F) === 0x0D && difes.length === 0 && vif === 0xFF &&
        isExtIdVifes(vifes, i < end ? bytes[i] : -1)) {
      var base = vifes.length === 1 ? i + 1 : i;
      if (base + 9 > end) {
        return;
      }
      store(data, opts.prefix + "error_flag", errState, readLeUint(bytes, base, 1));
      var id = readReversedBcd(bytes, base + 1, 4);
      store(data, opts.prefix + "serial", errState,
        id === null ? readLeUint(bytes, base + 1, 4) : id);
      i = base + 9;
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
    applyDib(bytes, i, length, dif, difes, vif, vifes, errState, data, opts);
    i += length;
  }
}

function decodeJsonFrame(bytes, data) {
  var start = bytes[0] === 0x20 ? 1 : 0;
  var text = "";
  for (var i = start; i < bytes.length; i++) {
    text += String.fromCharCode(bytes[i]);
  }
  var parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    parsed = null;
  }
  if (parsed === null || typeof parsed !== "object" ||
      Object.prototype.toString.call(parsed) === "[object Array]") {
    data.json_raw = text;
    return;
  }
  var names = { E: "energy", U: "unit", ID: "meter_id" };
  for (var key in parsed) {
    if (!Object.prototype.hasOwnProperty.call(parsed, key)) {
      continue;
    }
    data[Object.prototype.hasOwnProperty.call(names, key) ? names[key] : key] = parsed[key];
  }
}

function decodeFrame(bytes, data) {
  var format = bytes[0];
  if (format === 0x20 || format === 0x7B) {
    decodeJsonFrame(bytes, data);
    return;
  }
  var opts = {
    prefix: "",
    energyKey: "energy",
    dateKey: "meter_date_time",
    returnTempTable: RETURN_TEMPERATURE_C
  };
  if (format === 0xFA) {
    opts.dateKey = "date_time";
  } else if (format === 0x23) {
    opts.energyKey = "heat_energy";
    opts.returnTempTable = { 0x5E: 0.1 };
  } else if (format !== 0x1E && format !== 0x1F && format !== 0x21 && format !== 0x22) {
    return;
  }
  walkDibs(bytes, data, opts);
}

function decodeUplink(input) {
  var bytes = input && input.bytes ? input.bytes : null;
  var port = input ? input.fPort : undefined;
  if (typeof port === "undefined" || port === null || Number(port) !== Number(port)) {
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
