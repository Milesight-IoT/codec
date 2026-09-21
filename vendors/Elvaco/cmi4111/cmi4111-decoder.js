// Elvaco CMi4111 (integrated LoRaWAN meter module for Landis+Gyr T230/T330)
// uplink decoder. Source: CMi4111 User's Manual v1.1 [2020-06], section 6.7
// message formats (Tables 4-16).
//
// Uplinks use fPort 2 (manual fixes port 2 for downlinks; the TTN reference
// codec uses fPort 2 uplink). Payload = 1-byte message format id + M-Bus DIB
// sequence; JSON format 0x07 carries plaintext ASCII JSON instead:
//   0x05 Standard            0x06 Compact
//   0x08 Scheduled daily redundant (2nd energy DIB = energy at 24:00)
//   0x09 Scheduled extended  (07FFA0 / 07FF21 compressed blocks)
//   0x0A Combined heat/cool  (plain energy = heat, VIFE chain FF02 = cooling)
//   0x0B Simple billing      (DIF B4 + DIFE 01 = previous month energy)
//   0x0C Plausibility check  (VIF 58-5F = max temperatures, DIF 342x = missing time)
//   0x0D Monitoring          (Table 4 id; Table 16 misprints 0x0C)
//   0xFA daily clock message
// Numbers are INT32/INT16 little-endian, meter id 0C78 is 4-byte BCD
// little-endian, date/time VIF 6D is M-Bus type F. DIF function bits 11b
// mark error-state values (manual 6.7.3) and decode to null, except the
// intentionally error-coded missing-time DIB 342x. power is normalised to
// kW and forward temperature is reported as flow_temperature, matching the
// TTN reference vector keys (serial_from_message, error_flag); energy is
// normalised to kWh (Wh x0.001, MJ /3.6, MCal x1.163) like the CMi4130/4160/
// 4170 family; all other quantities use the manual VIF multiplier. Unknown
// DIBs are skipped.

var JSON_FORMAT_ID = 0x07;
var CLOCK_FORMAT_ID = 0xFA;
var COMBINED_FORMAT_ID = 0x0A;
var PLAUSIBILITY_FORMAT_ID = 0x0C;
var SCHEDULED_DAILY_FORMAT_ID = 0x08;
var MBUS_FORMAT_IDS = [0x05, 0x06, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D];

var ENERGY_FACTORS = {
  0x03: 0.001, 0x04: 0.01, 0x05: 0.1, 0x06: 1, 0x07: 10,
  0x0E: 1 / 3.6, 0x0F: 10 / 3.6
};
var SECONDARY_ENERGY_FACTORS = {
  0x83: 0.001, 0x84: 0.01, 0x85: 0.1, 0x86: 1, 0x87: 10,
  0x8E: 1 / 3.6, 0x8F: 10 / 3.6
};
var MCAL_FACTORS = { 0x8D: 1.163, 0x8E: 11.63, 0x8F: 116.3 };
var VOLUME_FACTORS = { 0x13: 0.001, 0x14: 0.01, 0x15: 0.1, 0x16: 1, 0x17: 10 };
var POWER_FACTORS_KW = { 0x2B: 0.001, 0x2C: 0.01, 0x2D: 0.1, 0x2E: 1, 0x2F: 10 };
var FLOW_FACTORS = { 0x3B: 0.001, 0x3C: 0.01, 0x3D: 0.1, 0x3E: 1, 0x3F: 10 };
var FORWARD_TEMPERATURE_FACTORS = { 0x58: 0.001, 0x59: 0.01, 0x5A: 0.1, 0x5B: 1 };
var RETURN_TEMPERATURE_FACTORS = { 0x5C: 0.001, 0x5D: 0.01, 0x5E: 0.1, 0x5F: 1 };

var DIF_DATA_LENGTHS = {
  0x01: 1, 0x02: 2, 0x03: 3, 0x04: 4, 0x05: 4, 0x06: 6, 0x07: 8,
  0x09: 2, 0x0A: 3, 0x0B: 4, 0x0C: 4, 0x0D: 6
};

function pad2(value) {
  return value < 10 ? "0" + value : "" + value;
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

function decodeDateTimeTypeF(value) {
  var minute = value & 0x3F;
  var hour = (value >>> 8) & 0x1F;
  var day = (value >>> 16) & 0x1F;
  var month = (value >>> 24) & 0x0F;
  var year = 2000 + (value >>> 28) * 8 + ((value >>> 21) & 0x07);
  return pad2(year) + "-" + pad2(month) + "-" + pad2(day) + " " + pad2(hour) + ":" + pad2(minute);
}

function resolveField(formatId, storage, vif, vifes, lenCode) {
  if (vifes.length === 0) {
    if (storage > 0) {
      if (ENERGY_FACTORS.hasOwnProperty(vif)) {
        return { key: "previous_month_energy", factor: ENERGY_FACTORS[vif], signed: true };
      }
      return null;
    }
    if (ENERGY_FACTORS.hasOwnProperty(vif)) {
      if (formatId === COMBINED_FORMAT_ID) {
        return { key: "heat_energy", factor: ENERGY_FACTORS[vif], signed: true };
      }
      return { key: "energy", factor: ENERGY_FACTORS[vif], signed: true };
    }
    if (VOLUME_FACTORS.hasOwnProperty(vif)) {
      return { key: "volume", factor: VOLUME_FACTORS[vif], signed: true };
    }
    if (POWER_FACTORS_KW.hasOwnProperty(vif)) {
      return { key: "power", factor: POWER_FACTORS_KW[vif], signed: true };
    }
    if (FLOW_FACTORS.hasOwnProperty(vif)) {
      return { key: "flow", factor: FLOW_FACTORS[vif], signed: true };
    }
    if (FORWARD_TEMPERATURE_FACTORS.hasOwnProperty(vif)) {
      if (formatId === PLAUSIBILITY_FORMAT_ID) {
        return { key: "max_flow_temperature", factor: FORWARD_TEMPERATURE_FACTORS[vif], signed: true };
      }
      return { key: "flow_temperature", factor: FORWARD_TEMPERATURE_FACTORS[vif], signed: true };
    }
    if (RETURN_TEMPERATURE_FACTORS.hasOwnProperty(vif)) {
      if (formatId === PLAUSIBILITY_FORMAT_ID) {
        return { key: "max_return_temperature", factor: RETURN_TEMPERATURE_FACTORS[vif], signed: true };
      }
      return { key: "return_temperature", factor: RETURN_TEMPERATURE_FACTORS[vif], signed: true };
    }
    if (formatId === PLAUSIBILITY_FORMAT_ID && vif >= 0x20 && vif <= 0x23) {
      return { key: "missing_time", factor: 1, signed: false };
    }
    if (vif === 0x6D) {
      return { key: formatId === CLOCK_FORMAT_ID ? "datetime" : "meter_datetime", datetime: true };
    }
    if (vif === 0x78 && lenCode === 0x0C) {
      return { key: "serial_from_message", bcd: true };
    }
    return null;
  }
  if (vifes.length === 1 && vif === 0xFD && vifes[0] === 0x17) {
    return { key: "error_flag", factor: 1, signed: false };
  }
  if (vifes.length === 2 && vifes[0] === 0xFF && vifes[1] === 0x02 &&
      SECONDARY_ENERGY_FACTORS.hasOwnProperty(vif)) {
    return { key: "cooling_energy", factor: SECONDARY_ENERGY_FACTORS[vif], signed: true };
  }
  if (vifes.length === 2 && vifes[0] === 0xFF && vifes[1] === 0x03 &&
      SECONDARY_ENERGY_FACTORS.hasOwnProperty(vif)) {
    return { key: "energy_in_wrong_mounting_position", factor: SECONDARY_ENERGY_FACTORS[vif], signed: true };
  }
  if (vif === 0xFB && vifes.length === 3 && vifes[1] === 0xFF && vifes[2] === 0x03 &&
      MCAL_FACTORS.hasOwnProperty(vifes[0])) {
    return { key: "energy_in_wrong_mounting_position", factor: MCAL_FACTORS[vifes[0]], signed: true };
  }
  return null;
}

function parseCompressedBlockA(bytes, offset, func, data) {
  data.flow_temperature = null;
  data.return_temperature = null;
  data.flow = null;
  data.power = null;
  if (func === 0x03) {
    return;
  }
  var scaling = bytes[offset];
  var powerExponent = ((scaling >> 4) & 0x07) - 3;
  var flowExponent = (scaling & 0x07) - 6;
  data.flow_temperature = readIntLE(bytes, offset + 1, 2) * 0.01;
  data.return_temperature = readIntLE(bytes, offset + 3, 2) * 0.01;
  data.flow = readIntLE(bytes, offset + 5, 2) * Math.pow(10, flowExponent);
  data.power = readIntLE(bytes, offset + 7, 2) * Math.pow(10, powerExponent) / 1000;
}

function parseCompressedBlockB(bytes, offset, func, data) {
  data.error_flag = null;
  data.serial_from_message = null;
  if (func === 0x03) {
    return;
  }
  data.error_flag = readUintLE(bytes, offset, 4);
  data.serial_from_message = readUintLE(bytes, offset + 4, 4);
}

function parseMbusFrame(formatId, bytes) {
  var data = {};
  var offset = 1;
  while (offset < bytes.length) {
    var dif = bytes[offset];
    offset += 1;
    var func = (dif >> 4) & 0x03;
    var lenCode = dif & 0x0F;
    var dataLen = DIF_DATA_LENGTHS[lenCode];
    if (dataLen === undefined) {
      return data;
    }
    var storage = 0;
    var storageCodedDif = dif === 0xB4;
    if (((dif & 0x08) !== 0 && lenCode !== 0x0C) || storageCodedDif) {
      var difeCount = 0;
      var dife = 0;
      do {
        if (offset >= bytes.length || difeCount >= 5) {
          return data;
        }
        dife = bytes[offset];
        offset += 1;
        difeCount += 1;
        if (difeCount === 1) {
          storage = dife & 0x3F;
        }
      } while ((dife & 0x80) !== 0);
    }
    if (lenCode === 0x07 && offset + 1 < bytes.length && bytes[offset] === 0xFF &&
        (bytes[offset + 1] === 0xA0 || bytes[offset + 1] === 0x21)) {
      if (bytes[offset + 1] === 0xA0) {
        if (offset + 11 > bytes.length) {
          return data;
        }
        parseCompressedBlockA(bytes, offset + 2, func, data);
        offset += 11;
      } else {
        if (offset + 10 > bytes.length) {
          return data;
        }
        parseCompressedBlockB(bytes, offset + 2, func, data);
        offset += 10;
      }
      continue;
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
        if (offset >= bytes.length || vifes.length >= 8) {
          return data;
        }
        vife = bytes[offset];
        offset += 1;
        vifes.push(vife);
      } while ((vife & 0x80) !== 0);
    }
    var field = resolveField(formatId, storage, vif, vifes, lenCode);
    if (field === null) {
      offset += dataLen;
      continue;
    }
    if (offset + dataLen > bytes.length) {
      return data;
    }
    var value;
    if (func === 0x03 && !storageCodedDif && field.key !== "missing_time") {
      value = null;
    } else if (field.bcd) {
      value = readBcdLE(bytes, offset, dataLen);
    } else if (field.datetime) {
      value = decodeDateTimeTypeF(readUintLE(bytes, offset, dataLen));
    } else if (field.signed) {
      value = readIntLE(bytes, offset, dataLen) * field.factor;
    } else {
      value = readUintLE(bytes, offset, dataLen) * field.factor;
    }
    offset += dataLen;
    var key = field.key;
    if (formatId === SCHEDULED_DAILY_FORMAT_ID && key === "energy" &&
        data.hasOwnProperty("energy")) {
      key = "accumulated_energy_2400";
    }
    data[key] = value;
  }
  return data;
}

function parseJsonFrame(bytes) {
  var text = "";
  for (var i = 1; i < bytes.length; i++) {
    if (bytes[i] === 0x00) {
      break;
    }
    text += String.fromCharCode(bytes[i]);
  }
  text = text.replace(/^\s+/, "").replace(/\s+$/, "");
  try {
    var parsed = JSON.parse(text);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      var data = {};
      var map = { E: "energy", U: "unit", ID: "meter_id" };
      for (var key in parsed) {
        if (parsed.hasOwnProperty(key)) {
          var out = map[key] !== undefined ? map[key] : key;
          data[out] = parsed[key];
        }
      }
      return data;
    }
  } catch (err) {}
  return { json_raw: text };
}

function decodePayload(bytes) {
  var formatId = bytes[0];
  if (formatId === JSON_FORMAT_ID) {
    return parseJsonFrame(bytes);
  }
  if (formatId === CLOCK_FORMAT_ID || MBUS_FORMAT_IDS.indexOf(formatId) !== -1) {
    return parseMbusFrame(formatId, bytes);
  }
  return {};
}

function decodeUplink(input) {
  var bytes = input && input.bytes ? input.bytes : [];
  var port = input ? input.fPort : undefined;
  var data = {};
  if (bytes.length > 0 && (port === undefined || port === null || Number(port) === 2)) {
    data = decodePayload(bytes);
  }
  return { data: data };
}

function Decode(fPort, bytes, variables) {
  return decodeUplink({ bytes: bytes, fPort: fPort }).data;
}

function Decoder(bytes, fPort) {
  return decodeUplink({ bytes: bytes, fPort: fPort }).data;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { decodeUplink: decodeUplink, Decode: Decode, Decoder: Decoder };
}
