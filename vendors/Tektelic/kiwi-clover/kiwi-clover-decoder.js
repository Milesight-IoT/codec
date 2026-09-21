var GWC_TABLE = [
  { upper: 1402, lower: 1399, gwc: 0 },
  { upper: 1399, lower: 1396, gwc: 10 },
  { upper: 1396, lower: 1391, gwc: 20 },
  { upper: 1391, lower: 1386, gwc: 30 },
  { upper: 1386, lower: 1381, gwc: 40 },
  { upper: 1381, lower: 1376, gwc: 50 },
  { upper: 1376, lower: 1371, gwc: 60 },
  { upper: 1371, lower: 1366, gwc: 70 },
  { upper: 1366, lower: 1361, gwc: 80 },
  { upper: 1361, lower: 1356, gwc: 90 },
  { upper: 1356, lower: 1351, gwc: 100 },
  { upper: 1351, lower: 1346, gwc: 110 },
  { upper: 1346, lower: 1341, gwc: 120 },
  { upper: 1341, lower: 1322, gwc: 120 }
];

var WATERMARK_CURVES = [
  { min: 4330, max: 6430, base: 9, ref: 4330, slope: 0.004286 },
  { min: 2820, max: 4330, base: 15, ref: 2820, slope: 0.003974 },
  { min: 1110, max: 2820, base: 35, ref: 1110, slope: 0.01170 },
  { min: 770, max: 1110, base: 55, ref: 770, slope: 0.05884 },
  { min: 600, max: 770, base: 75, ref: 600, slope: 0.1176 },
  { min: 485, max: 600, base: 100, ref: 485, slope: 0.2174 },
  { min: 293, max: 485, base: 200, ref: 293, slope: 0.5208 }
];

var REGISTER_SIZES = {
  0x10: 2, 0x11: 2, 0x12: 2, 0x13: 5,
  0x20: 4, 0x21: 2, 0x22: 2, 0x23: 2, 0x24: 2, 0x25: 2, 0x26: 2, 0x27: 2,
  0x28: 2, 0x29: 2, 0x2A: 2, 0x2C: 2, 0x2D: 2, 0x2E: 2,
  0x30: 4, 0x31: 4, 0x32: 2, 0x33: 1, 0x34: 2, 0x35: 1, 0x36: 4, 0x37: 4,
  0x38: 4, 0x39: 4, 0x3A: 4, 0x3B: 4, 0x3C: 4, 0x3D: 4, 0x3F: 1,
  0x40: 4, 0x41: 4, 0x42: 2, 0x43: 1, 0x44: 2, 0x45: 2,
  0x48: 1, 0x49: 2, 0x4A: 2, 0x4B: 4, 0x4C: 4, 0x4D: 1,
  0x50: 2, 0x51: 1, 0x52: 1,
  0x61: 1, 0x62: 1,
  0x70: 2, 0x71: 7, 0x72: 1
};

function rnd(v, n) {
  var f = Math.pow(10, n);
  return Math.round(v * f) / f;
}

function toSigned16(raw) {
  return raw >= 0x8000 ? raw - 0x10000 : raw;
}

function toSigned8(raw) {
  return raw >= 0x80 ? raw - 0x100 : raw;
}

function gwcFromFrequency(khz) {
  for (var i = 0; i < GWC_TABLE.length; i++) {
    if (khz >= GWC_TABLE[i].lower && khz <= GWC_TABLE[i].upper) {
      return GWC_TABLE[i].gwc;
    }
  }
  return null;
}

function tensionFromFrequency(hz) {
  if (hz > 6430) {
    return 0;
  }
  if (hz < 293) {
    return 200;
  }
  for (var i = 0; i < WATERMARK_CURVES.length; i++) {
    var c = WATERMARK_CURVES[i];
    if (hz >= c.min && hz <= c.max) {
      return c.base - (hz - c.ref) * c.slope;
    }
  }
  return null;
}

function temperatureAdjustedKpa(kpa, soilTemp) {
  if (soilTemp === null || soilTemp === undefined) {
    return kpa;
  }
  if (Math.abs(soilTemp - 24) < 6) {
    return kpa;
  }
  return kpa * (1 - 0.019 * (soilTemp - 24));
}

function thermistorTemp(v) {
  return -33.01 * Math.pow(v, 5) + 217.4 * Math.pow(v, 4) - 538.6 * Math.pow(v, 3) + 628.1 * Math.pow(v, 2) - 378.9 * v + 102.9;
}

function soilMoistureTemp(v) {
  return -32.46 * Math.log(v * 1000) + 236.36;
}

function parseTransducerBlocks(bytes) {
  var data = {};
  var errors = [];
  var i = 0;
  while (i < bytes.length) {
    if (i + 2 > bytes.length) {
      errors.push("trailing_byte_at_offset_" + i);
      break;
    }
    var ch = bytes[i];
    var type = bytes[i + 1];
    var body = bytes.slice(i + 2);
    if (ch === 0x00 && type === 0xBA && body.length >= 1) {
      data.battery_voltage = rnd((body[0] & 0x7f) * 0.01, 2);
      data.battery_eos_alert = (body[0] & 0x80) ? 1 : 0;
      i += 3;
    } else if (ch === 0x00 && type === 0xD3 && body.length >= 1) {
      data.rem_batt_capacity = body[0];
      i += 3;
    } else if (ch === 0x00 && type === 0xBD && body.length >= 2) {
      data.rem_batt_days = (body[0] << 8) | body[1];
      i += 4;
    } else if (ch === 0x01 && type === 0x04 && body.length >= 2) {
      data.input1_frequency = (body[0] << 8) | body[1];
      i += 4;
    } else if (ch === 0x02 && type === 0x02 && body.length >= 2) {
      data.input2_voltage = rnd(((body[0] << 8) | body[1]) * 0.001, 3);
      i += 4;
    } else if (ch === 0x03 && type === 0x02 && body.length >= 2) {
      data.input3_voltage = rnd(((body[0] << 8) | body[1]) * 0.001, 3);
      i += 4;
    } else if (ch === 0x03 && type === 0x67 && body.length >= 2) {
      data.input3_temperature = rnd(toSigned16((body[0] << 8) | body[1]) * 0.1, 1);
      i += 4;
    } else if (ch === 0x04 && type === 0x02 && body.length >= 2) {
      data.input4_voltage = rnd(((body[0] << 8) | body[1]) * 0.001, 3);
      i += 4;
    } else if (ch === 0x04 && type === 0x67 && body.length >= 2) {
      data.input4_temperature = rnd(toSigned16((body[0] << 8) | body[1]) * 0.1, 1);
      i += 4;
    } else if (ch === 0x05 && type === 0x04 && body.length >= 2) {
      data.watermark1_frequency = (body[0] << 8) | body[1];
      i += 4;
    } else if (ch === 0x06 && type === 0x04 && body.length >= 2) {
      data.watermark2_frequency = (body[0] << 8) | body[1];
      i += 4;
    } else if (ch === 0x09 && type === 0x65 && body.length >= 2) {
      data.light_intensity = (body[0] << 8) | body[1];
      i += 4;
    } else if (ch === 0x09 && type === 0x00 && body.length >= 1) {
      data.light_detected = body[0] === 0xff ? 1 : 0;
      i += 3;
    } else if (ch === 0x0A && type === 0x71 && body.length >= 6) {
      data.accelerometer_xaxis = rnd(toSigned16((body[0] << 8) | body[1]) / 1000, 3);
      data.accelerometer_yaxis = rnd(toSigned16((body[2] << 8) | body[3]) / 1000, 3);
      data.accelerometer_zaxis = rnd(toSigned16((body[4] << 8) | body[5]) / 1000, 3);
      i += 8;
    } else if (ch === 0x0A && type === 0x00 && body.length >= 1) {
      data.orientation_alarm = body[0] === 0xff ? 1 : 0;
      i += 3;
    } else if (ch === 0x0B && type === 0x67 && body.length >= 2) {
      data.ambient_temperature = rnd(toSigned16((body[0] << 8) | body[1]) * 0.1, 1);
      i += 4;
    } else if (ch === 0x0B && type === 0x68 && body.length >= 1) {
      data.relative_humidity = rnd(body[0] * 0.5, 1);
      i += 3;
    } else if (ch === 0x0C && type === 0x67 && body.length >= 2) {
      data.mcu_temperature = rnd(toSigned16((body[0] << 8) | body[1]) * 0.1, 1);
      i += 4;
    } else {
      errors.push("unknown_block_" + ch.toString(16) + "_" + type.toString(16) + "_at_offset_" + i);
      break;
    }
  }
  return { data: data, errors: errors };
}

function applyDerivedConversions(data) {
  var soilTemp = null;
  if (data.input4_temperature !== undefined) {
    soilTemp = data.input4_temperature;
  } else if (data.input3_temperature !== undefined) {
    soilTemp = data.input3_temperature;
  } else if (data.input4_voltage !== undefined) {
    soilTemp = thermistorTemp(data.input4_voltage);
    data.input4_voltage_to_temp = rnd(soilTemp, 1);
  } else if (data.input3_voltage !== undefined) {
    soilTemp = thermistorTemp(data.input3_voltage);
    data.input3_voltage_to_temp = rnd(soilTemp, 1);
  }
  if (data.input3_voltage !== undefined && data.input3_voltage_to_temp === undefined) {
    data.input3_voltage_to_temp = rnd(thermistorTemp(data.input3_voltage), 1);
  }
  if (data.input4_voltage !== undefined && data.input4_voltage_to_temp === undefined) {
    data.input4_voltage_to_temp = rnd(thermistorTemp(data.input4_voltage), 1);
  }
  if (data.input2_voltage !== undefined) {
    data.input2_voltage_to_temp = rnd(soilMoistureTemp(data.input2_voltage), 1);
  }
  if (data.input1_frequency !== undefined) {
    var gwc = gwcFromFrequency(data.input1_frequency);
    if (gwc !== null) {
      data.input1_frequency_to_moisture = gwc;
    }
  }
  var effectiveSoilTemp = null;
  if (data.input4_temperature !== undefined) {
    effectiveSoilTemp = data.input4_temperature;
  } else if (data.input3_temperature !== undefined) {
    effectiveSoilTemp = data.input3_temperature;
  } else if (data.input4_voltage_to_temp !== undefined) {
    effectiveSoilTemp = data.input4_voltage_to_temp;
  } else if (data.input3_voltage_to_temp !== undefined) {
    effectiveSoilTemp = data.input3_voltage_to_temp;
  }
  if (data.watermark1_frequency !== undefined) {
    var t1 = tensionFromFrequency(data.watermark1_frequency);
    if (t1 !== null) {
      data.watermark1_tension = rnd(temperatureAdjustedKpa(t1, effectiveSoilTemp), 1);
    }
  }
  if (data.watermark2_frequency !== undefined) {
    var t2 = tensionFromFrequency(data.watermark2_frequency);
    if (t2 !== null) {
      data.watermark2_tension = rnd(temperatureAdjustedKpa(t2, effectiveSoilTemp), 1);
    }
  }
  return data;
}

function parseUplinkResponse(bytes) {
  var data = {};
  var errors = [];
  if (bytes.length < 4) {
    errors.push("response_shorter_than_crc32");
    return { data: data, errors: errors };
  }
  var crc = 0;
  for (var i = 0; i < 4; i++) {
    crc = crc * 256 + bytes[i];
  }
  data.crc32_of_dl_payload = crc;
  var j = 4;
  while (j < bytes.length) {
    var addr = bytes[j];
    var size = REGISTER_SIZES[addr];
    if (size === undefined) {
      errors.push("unknown_register_0x" + addr.toString(16) + "_at_offset_" + j);
      break;
    }
    if (j + 1 + size > bytes.length) {
      errors.push("register_0x" + addr.toString(16) + "_value_truncated");
      break;
    }
    var value = 0;
    for (var k = 0; k < size; k++) {
      value = value * 256 + bytes[j + 1 + k];
    }
    data["register_0x" + (addr < 16 ? "0" : "") + addr.toString(16)] = value;
    j += 1 + size;
  }
  return { data: data, errors: errors };
}

function encodeDownlink(input) {
  var bytes = [];
  var d = input.data || {};
  var writes = d.writes || [];
  var reads = d.reads || [];
  for (var i = 0; i < writes.length; i++) {
    var w = writes[i];
    var addr = w.address;
    var size = w.size !== undefined ? w.size : REGISTER_SIZES[addr];
    if (size === undefined) {
      throw new Error("unknown_register_size_0x" + addr.toString(16));
    }
    bytes.push(0x80 | addr);
    var value = w.value;
    for (var b = size - 1; b >= 0; b--) {
      bytes.push((value >> (8 * b)) & 0xff);
    }
  }
  for (var r = 0; r < reads.length; r++) {
    bytes.push(reads[r] & 0x7f);
  }
  return { bytes: bytes, fPort: 100 };
}

function decodeDownlink(input) {
  var bytes = input.bytes;
  var commands = [];
  var i = 0;
  while (i < bytes.length) {
    var b0 = bytes[i];
    if (b0 & 0x80) {
      var addr = b0 & 0x7f;
      var size = REGISTER_SIZES[addr];
      if (size === undefined || i + 1 + size > bytes.length) {
        break;
      }
      var value = 0;
      for (var k = 0; k < size; k++) {
        value = value * 256 + bytes[i + 1 + k];
      }
      commands.push({ type: "write", address: addr, value: value });
      i += 1 + size;
    } else {
      commands.push({ type: "read", address: b0 & 0x7f });
      i += 1;
    }
  }
  return { data: { commands: commands } };
}

function decodeUplink(input) {
  var fPort = input.fPort;
  var bytes = input.bytes || [];
  if (fPort === undefined || fPort === null) {
    fPort = 10;
  }
  if (fPort === 0) {
    return { data: {} };
  }
  if (fPort === 100) {
    var r = parseUplinkResponse(bytes);
    return { data: r.data, errors: r.errors };
  }
  if (fPort === 10) {
    var p = parseTransducerBlocks(bytes);
    var data = applyDerivedConversions(p.data);
    var result = { data: data };
    if (p.errors.length) {
      result.errors = p.errors;
    }
    return result;
  }
  return { data: {}, errors: ["unsupported_fport_" + fPort] };
}

module.exports = {
  decodeUplink: decodeUplink,
  decodeDownlink: decodeDownlink,
  encodeDownlink: encodeDownlink
};
