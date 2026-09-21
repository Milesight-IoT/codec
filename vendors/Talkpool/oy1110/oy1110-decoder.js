// Talkpool OY1110 LoRaWAN temperature and humidity sensor uplink decoder
// Source: OY1110 UserManual v1.0 (2019-01), chapter 9 payload (pp. 12-19).
//
// fPort 1: status report / query response, frame = Type(1B) + Index(1B) + Data.
//   Type 0x01 = Data, 0x02 = Command NACK.
//   Index 0x03 FW build hash (6 x uint8, hex string), 0x06 CPU voltage
//   (uint8, 25 mV/LSB), 0x0A CPU temperature (uint16 BE, 0.01 degC/LSB,
//   -50 degC offset), 0x20 status (uint8 bitfield), 0x23 measurement
//   interval (uint16 BE minutes), 0x24 tx group size (uint8).
// fPort 2: single measurement, 3 bytes, two unsigned 12-bit values.
//   temperature = (raw - 800) / 10 degC, humidity = (raw - 250) / 10 %RH.
// fPort 3: grouped measurements, 1 header byte (interval dT, bit7: 0=min,
//   1=h) + n x 3 bytes, newest first. Records are flattened as
//   record_<i>_temperature / record_<i>_humidity (max 12) + record_count.

function toHexUpper(bytes, offset, length) {
  var out = "";
  for (var i = 0; i < length; i++) {
    var b = bytes[offset + i];
    out += ((b >> 4) & 0x0F).toString(16) + (b & 0x0F).toString(16);
  }
  return out.toUpperCase();
}

function indexName(index) {
  if (index === 0x03) return "fw_hash";
  if (index === 0x06) return "cpu_voltage";
  if (index === 0x0A) return "cpu_temperature";
  if (index === 0x20) return "status";
  if (index === 0x23) return "report_interval_min";
  if (index === 0x24) return "tx_group";
  return null;
}

function decodePort1(bytes, data) {
  var type = bytes[0];
  if (type === 0x02) {
    data.type = "nack";
    if (bytes.length >= 2) {
      var nackName = indexName(bytes[1]);
      data.index = nackName === null ? bytes[1] : nackName;
    }
    return;
  }
  if (type !== 0x01) {
    return;
  }
  data.type = "data";
  if (bytes.length < 2) {
    return;
  }
  var name = indexName(bytes[1]);
  if (name === null) {
    data.index = bytes[1];
    return;
  }
  data.index = name;
  if (name === "fw_hash") {
    if (bytes.length >= 3) {
      data.fw_hash = toHexUpper(bytes, 2, Math.min(6, bytes.length - 2));
    }
  } else if (name === "cpu_voltage") {
    if (bytes.length >= 3) {
      data.cpu_voltage = bytes[2] * 0.025;
    }
  } else if (name === "cpu_temperature") {
    if (bytes.length >= 4) {
      data.cpu_temperature = ((bytes[2] << 8) | bytes[3]) * 0.01 - 50;
    }
  } else if (name === "status") {
    if (bytes.length >= 3) {
      data.status = bytes[2];
    }
  } else if (name === "report_interval_min") {
    if (bytes.length >= 4) {
      data.report_interval_min = (bytes[2] << 8) | bytes[3];
    }
  } else if (name === "tx_group") {
    if (bytes.length >= 3) {
      data.tx_group = bytes[2];
    }
  }
}

function decodePort2(bytes, data) {
  if (bytes.length < 3) {
    return;
  }
  var tRaw = (bytes[0] << 4) | (bytes[2] >> 4);
  var hRaw = (bytes[1] << 4) | (bytes[2] & 0x0F);
  data.temperature = (tRaw - 800) / 10;
  data.humidity = (hRaw - 250) / 10;
}

function decodePort3(bytes, data) {
  var count = Math.floor((bytes.length - 1) / 3);
  if (count > 12) {
    count = 12;
  }
  for (var i = 0; i < count; i++) {
    var o = 1 + i * 3;
    var tRaw = (bytes[o] << 4) | (bytes[o + 2] >> 4);
    var hRaw = (bytes[o + 1] << 4) | (bytes[o + 2] & 0x0F);
    data["record_" + (i + 1) + "_temperature"] = (tRaw - 800) / 10;
    data["record_" + (i + 1) + "_humidity"] = (hRaw - 250) / 10;
  }
  data.record_count = count;
}

function decodeUplink(input) {
  var bytes = input ? input.bytes : null;
  var port = input ? Number(input.fPort) : NaN;
  var data = {};
  if (!bytes || !bytes.length) {
    return { data: {} };
  }
  if (port === 1) {
    decodePort1(bytes, data);
  } else if (port === 2) {
    decodePort2(bytes, data);
  } else if (port === 3) {
    decodePort3(bytes, data);
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
