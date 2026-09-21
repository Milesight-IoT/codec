// Talkpool OY1700 LoRaWAN air quality (PM) sensor uplink payload decoder
// Source: OY1700 User Manual v0.1 (2019-09), protocol chapter 8 (payload pp. 13-18)
// fPort 1: status frame and query responses, Type + Index + data
//   (Type 0x01 = Data, 0x02 = Command NACK; downlink types 0x01 Set / 0x02 Query / 0x03 Action)
// fPort 2: periodic measurement, fixed 9 bytes (manual 8.3.1 prints "Size: 5 Bytes",
//   but field table, byte layout and example are all 9 bytes; 9-byte layout applied):
//   12-bit big-endian temperature, (raw - 800) / 10 degC, and 12-bit big-endian humidity,
//   (raw - 250) / 10 %RH, low nibbles packed in byte 2 (bit7-4 temperature, bit3-0 humidity),
//   then PM10 / PM2.5 / PM1.0 as uint16 big-endian at offsets 3 / 5 / 7.
//   Manual states PM unit "ppm (1 x 10^-6)"; kept as documented, this decoder emits raw counts only.
// CPU temperature (0x0A) encoding is garbled in the manual; decoded as 0.01 degC/LSB with
//   -50 degC offset per the command table range -50..+125 degC (unconfirmed conversion).

var UPLINK_TYPE_NAMES = { 1: "data", 2: "command_nack", 3: "action" };

function readUint16(bytes, offset) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function toHexUpper(bytes, offset, length) {
  var out = "";
  var i;
  var h;
  for (i = 0; i < length; i++) {
    h = (bytes[offset + i] & 0xFF).toString(16);
    if (h.length < 2) {
      h = "0" + h;
    }
    out += h.toUpperCase();
  }
  return out;
}

function decodeMeasurement(bytes, offset) {
  var data = {};
  if (bytes.length < offset + 3) {
    return data;
  }
  var temperatureRaw = (bytes[offset] << 4) | (bytes[offset + 2] >> 4);
  var humidityRaw = (bytes[offset + 1] << 4) | (bytes[offset + 2] & 0x0F);
  data.temperature = (temperatureRaw - 800) / 10;
  data.humidity = (humidityRaw - 250) / 10;
  if (bytes.length >= offset + 5) {
    data.pm10 = readUint16(bytes, offset + 3);
  }
  if (bytes.length >= offset + 7) {
    data.pm2_5 = readUint16(bytes, offset + 5);
  }
  if (bytes.length >= offset + 9) {
    data.pm1 = readUint16(bytes, offset + 7);
  }
  return data;
}

function decodePort1(bytes) {
  var data = {};
  if (bytes.length < 2) {
    return data;
  }
  var type = bytes[0];
  var index = bytes[1];
  data.type = UPLINK_TYPE_NAMES[type] !== undefined ? UPLINK_TYPE_NAMES[type] : type;
  data.index = index;
  if (type === 0x02) {
    return data;
  }
  if (index === 0x03) {
    if (bytes.length >= 8) {
      data.fw_build_hash = toHexUpper(bytes, 2, 6);
    }
  } else if (index === 0x05) {
    data.command = "device_reset";
  } else if (index === 0x06) {
    if (bytes.length >= 3) {
      data.cpu_voltage = bytes[2] * 0.025;
    }
  } else if (index === 0x0A) {
    if (bytes.length >= 4) {
      data.cpu_temperature = readUint16(bytes, 2) * 0.01 - 50;
    }
  } else if (index === 0x20) {
    if (bytes.length >= 3) {
      data.status = bytes[2];
      data.normal_startup = (bytes[2] & 0x01) === 0;
      data.boot_problem = (bytes[2] & 0x02) !== 0;
    }
  } else if (index === 0x23) {
    if (bytes.length >= 4) {
      data.measurement_interval = readUint16(bytes, 2);
    }
  } else if (index === 0x2B) {
    var measurement = decodeMeasurement(bytes, 2);
    var key;
    for (key in measurement) {
      data[key] = measurement[key];
    }
  }
  return data;
}

function decodeUplink(input) {
  var bytes = input.bytes;
  var fPort = input.fPort;
  var data = {};
  if (bytes && bytes.length > 0) {
    if (fPort === 1) {
      data = decodePort1(bytes);
    } else if (fPort === 2) {
      data = decodeMeasurement(bytes, 0);
    }
  }
  return { data: data };
}

function Decode(fPort, bytes) {
  return decodeUplink({ bytes: bytes, fPort: fPort });
}

function Decoder(bytes, port) {
  return decodeUplink({ bytes: bytes, fPort: port });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { decodeUplink: decodeUplink, Decode: Decode, Decoder: Decoder };
}
