// Elvaco CMI4110 heat meter connectivity module (Landis+Gyr UH50/UC50)
// uplink decoder. Source: CMI4110 User Manual v1.5 [2021-10], section 6.6
// message formats (Tables 5-12).
//
// fPort 2 (default) and fPort 3 (scheduled mode data): M-Bus EN 13757-3
// telegrams, payload[0] = message format ID (Table 5): 0x00 Standard,
// 0x01 Compact, 0x02 JSON, 0x03 Scheduled-daily redundant, 0x04
// Scheduled-extended, 0x3F/0x40 Scheduled-extended+ telegram 1/2, 0x41
// Compact tariff. Remaining bytes are DIBs: DIF + VIF + data, where
// DIF 0x0C/0x0B/0x0A = 4/3/2-byte little-endian BCD, 0x02 = uint16,
// 0x04 = EN 13757 type F date/time, 0x4C = accumulated energy (4-byte BCD);
// DIF +0x30 marks a value captured during error state (0x4C error form is
// 0x3C). VIF gives unit and decimals: 06 = kWh, 07/FB00/FB01 = MWh
// 2/1/0 decimals, 0E/0F/FB08/FB09 = GJ 3/2/1/0 decimals, 14/15/16 = m3
// 2/1/0 decimals, 2B-2E = kW, 3B-3E = m3/h, 5A/5B and 5E/5F = degC,
// 78 = meter id, 6D = date/time, FD17 = error/warning flags. Energy-family
// VIFs repeat in tariff formats (2nd-4th occurrence = tariff 1-3) and DIF
// 0x4C in Scheduled-daily = energy at 24:00. Payload starting 0xFA is the
// scheduled-mode clock message (7 bytes, port 2). 0x0E 0x00 (JSON: "{}") is
// the meter communication error message (Table 12). Scheduled-extended+
// telegram fields are flattened with t1_/t2_ prefixes.

var DIF_LENGTHS = {
  0x0C: 4, 0x3C: 4, 0x4C: 4,
  0x0B: 3, 0x3B: 3,
  0x0A: 2, 0x3A: 2,
  0x02: 2, 0x32: 2,
  0x04: 4, 0x34: 4
};

var ENERGY_DECIMALS = {
  0x06: 0, 0x07: 2, 0xFB00: 1, 0xFB01: 0,
  0x0E: 3, 0x0F: 2, 0xFB08: 1, 0xFB09: 0
};

var VIF_FIELDS = {
  0x14: ["volume", 2], 0x15: ["volume", 1], 0x16: ["volume", 0],
  0x2B: ["power", 3], 0x2C: ["power", 2], 0x2D: ["power", 1], 0x2E: ["power", 0],
  0x3B: ["flow", 3], 0x3C: ["flow", 2], 0x3D: ["flow", 1], 0x3E: ["flow", 0],
  0x5A: ["flow_temperature", 1], 0x5B: ["flow_temperature", 0],
  0x5E: ["return_temperature", 1], 0x5F: ["return_temperature", 0]
};

function pad2(value) {
  return value < 10 ? "0" + value : "" + value;
}

function decodeBcd(bytes, offset, length) {
  var value = 0;
  for (var i = length - 1; i >= 0; i--) {
    var b = bytes[offset + i];
    var hi = (b >> 4) & 0x0F;
    var lo = b & 0x0F;
    if (hi > 9 || lo > 9) {
      return null;
    }
    value = value * 100 + hi * 10 + lo;
  }
  return value;
}

function decodeUint16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function decodeTypeF(bytes, offset) {
  var raw = (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16)) + bytes[offset + 3] * 16777216;
  var yearHi = (raw >>> 28) & 0x0F;
  var month = (raw >>> 24) & 0x0F;
  var yearLo = (raw >>> 21) & 0x07;
  var day = (raw >>> 16) & 0x1F;
  var hour = (raw >>> 8) & 0x1F;
  var minute = raw & 0x3F;
  var year = ((yearHi << 3) | yearLo) % 100;
  return pad2(year) + "-" + pad2(month) + "-" + pad2(day) + " " + pad2(hour) + ":" + pad2(minute);
}

function walkDibs(bytes, start, formatId, data, prefix) {
  var i = start;
  var energyCount = 0;
  var seenEnergy = false;
  var hasTariffs = formatId === 0x3F || formatId === 0x41;
  var isDaily = formatId === 0x03;
  while (i < bytes.length) {
    var dif = bytes[i];
    if (dif === 0x0E) {
      data.meter_communication_error = true;
      break;
    }
    var length = DIF_LENGTHS[dif];
    if (!length) {
      break;
    }
    if (i + 1 >= bytes.length) {
      break;
    }
    var vif = bytes[i + 1];
    var vifLength = 1;
    var vifKey = vif;
    if (vif === 0xFB || vif === 0xFD) {
      if (i + 2 >= bytes.length) {
        break;
      }
      vifLength = 2;
      vifKey = (vif << 8) | bytes[i + 2];
    }
    var dataStart = i + 1 + vifLength;
    if (dataStart + length > bytes.length) {
      break;
    }
    if ((dif === 0x04 || dif === 0x34) && vifKey === 0x6D) {
      if (prefix === "clock_") {
        data.clock_time_valid = dif === 0x04;
        data.clock_date_time = decodeTypeF(bytes, dataStart);
      } else {
        data[prefix + "meter_date_time"] = decodeTypeF(bytes, dataStart);
      }
    } else if ((dif === 0x02 || dif === 0x32) && vifKey === 0xFD17) {
      data[prefix + "error_flag"] = decodeUint16(bytes, dataStart);
    } else if (dif !== 0x02 && dif !== 0x32 && dif !== 0x04 && dif !== 0x34) {
      var name = null;
      var decimals = 0;
      if (vifKey === 0x78) {
        name = "serial";
      } else if (Object.prototype.hasOwnProperty.call(ENERGY_DECIMALS, vifKey)) {
        decimals = ENERGY_DECIMALS[vifKey];
        if (dif === 0x4C || (dif === 0x3C && isDaily && seenEnergy)) {
          name = "energy_at_2400";
        } else {
          energyCount += 1;
          if (hasTariffs && energyCount >= 2 && energyCount <= 4) {
            name = "tariff_" + (energyCount - 1);
          } else if (energyCount === 1) {
            name = "energy";
            seenEnergy = true;
          }
        }
      } else if (Object.prototype.hasOwnProperty.call(VIF_FIELDS, vifKey)) {
        name = VIF_FIELDS[vifKey][0];
        decimals = VIF_FIELDS[vifKey][1];
      }
      if (name !== null) {
        var numeric = decodeBcd(bytes, dataStart, length);
        if (numeric !== null) {
          data[prefix + name] = numeric / Math.pow(10, decimals);
        }
      }
    }
    i = dataStart + length;
  }
}

function decodeJsonPayload(bytes, start, end, data) {
  var text = "";
  for (var i = start; i < end; i++) {
    text += String.fromCharCode(bytes[i]);
  }
  var parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    parsed = null;
  }
  if (parsed === null || typeof parsed !== "object" || parsed instanceof Array) {
    data.json_raw = text;
    return;
  }
  var count = 0;
  for (var key in parsed) {
    if (Object.prototype.hasOwnProperty.call(parsed, key)) {
      data[key] = parsed[key];
      count += 1;
    }
  }
  if (count === 0) {
    data.meter_communication_error = true;
  }
}

function decodeUplink(input) {
  var bytes = input ? input.bytes : null;
  var port = input ? Number(input.fPort) : NaN;
  if (isNaN(port)) {
    port = 2;
  }
  if (!bytes || bytes.length === 0) {
    return { data: {} };
  }
  if (port !== 2 && port !== 3) {
    return { data: {} };
  }
  var data = {};
  var format = bytes[0];
  if (format === 0x0E) {
    data.meter_communication_error = true;
  } else if (format === 0xFA) {
    walkDibs(bytes, 1, format, data, "clock_");
  } else if (format === 0x02) {
    decodeJsonPayload(bytes, 1, bytes.length, data);
  } else if (format === 0x7B) {
    decodeJsonPayload(bytes, 0, bytes.length, data);
  } else if (format === 0x3F) {
    walkDibs(bytes, 1, format, data, "t1_");
  } else if (format === 0x40) {
    walkDibs(bytes, 1, format, data, "t2_");
  } else if (format === 0x00 || format === 0x01 || format === 0x03 || format === 0x04 || format === 0x41) {
    walkDibs(bytes, 1, format, data, "");
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
