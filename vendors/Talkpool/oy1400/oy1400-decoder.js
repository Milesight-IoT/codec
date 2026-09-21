// Talkpool OY1400 LoRaWAN payload decoder
// Industrial communication and control unit, 2-channel 0-10V / 4-20mA sensor input.
// Source: OY1400 Manual (UG_OY1400), Protocol chapter pp. 7-10.
// Uplink frame: Type (1 byte) + Index (1 byte) + Data, multi-byte fields big-endian.
// Type 0x01 = Data, Type 0x02 = Command NACK. The manual defines no application
// fPort, so frames are routed by Type+Index only; input.fPort is passed through
// as data.fport when present and never used for branching.
// Analog readings are 1/8 mV units (0-26400): channel volts = raw / 8000,
// 0-10V jumper mode = volts * 4.1, 4-20mA shunt mode (120 ohm) = volts / 120 * 1000 mA.

function readU16BE(bytes, i) {
  return bytes[i] * 256 + bytes[i + 1];
}

function toHexUpper(bytes, len) {
  var out = "";
  for (var i = 0; i < len; i++) {
    var h = (bytes[i] & 0xFF).toString(16);
    if (h.length < 2) h = "0" + h;
    out += h.toUpperCase();
  }
  return out;
}

var MAX_TX_GROUP_SIZE = 12;
var MEASURE_FRAME_WIDTHS = {
  0x21: [2, 2],
  0x22: [1, 2],
  0x23: [2, 1],
  0x24: [1, 1]
};

function addAnalogReading(data, channel, suffix, raw) {
  var volts = raw / 8000;
  data[channel + "_value" + suffix] = volts;
  data[channel + "_voltage" + suffix] = volts * 4.1;
  data[channel + "_current" + suffix] = (volts / 120) * 1000;
}

function decodeMeasureFrame(index, payload) {
  var data = {};
  var widths = MEASURE_FRAME_WIDTHS[index];
  var perGroup = widths[0] + widths[1];
  var count = Math.floor(payload.length / perGroup);
  if (count > MAX_TX_GROUP_SIZE) {
    count = MAX_TX_GROUP_SIZE;
  }
  if (count < 1) {
    return data;
  }
  data.tx_group_size = count;
  var i;
  for (i = 0; i < count; i++) {
    var off = i * perGroup;
    var suffix = count > 1 ? "_" + (i + 1) : "";
    if (widths[0] === 2) {
      addAnalogReading(data, "channel_1", suffix, readU16BE(payload, off));
    } else {
      data["channel_1_value" + suffix] = payload[off];
    }
    if (widths[1] === 2) {
      addAnalogReading(data, "channel_2", suffix, readU16BE(payload, off + widths[0]));
    } else {
      data["channel_2_value" + suffix] = payload[off + widths[0]];
    }
  }
  return data;
}

function decodeDataFrame(index, payload) {
  var data = {};
  if (MEASURE_FRAME_WIDTHS[index] !== undefined) {
    return decodeMeasureFrame(index, payload);
  }
  if (index === 0x03) {
    if (payload.length > 0) {
      var len = payload.length >= 6 ? 6 : payload.length;
      data.fw_build_hash = toHexUpper(payload, len);
    }
  } else if (index === 0x05) {
    data.device_reset = true;
  } else if (index === 0x06) {
    if (payload.length >= 1) {
      data.cpu_voltage = payload[0] * 0.025;
    }
  } else if (index === 0x0A) {
    if (payload.length >= 2) {
      data.cpu_temperature = readU16BE(payload, 0) / 100 - 50;
    }
  } else if (index === 0x25) {
    if (payload.length >= 1) {
      data.application_type = payload[0];
    }
  } else if (index === 0x26) {
    if (payload.length >= 2) {
      data.measurement_interval = readU16BE(payload, 0);
    }
  } else if (index === 0x27) {
    if (payload.length >= 1) {
      data.tx_group_size = payload[0];
    }
  } else if (index === 0x28) {
    if (payload.length >= 2) {
      data.sensor_delay = readU16BE(payload, 0);
    }
  } else if (index === 0x29) {
    if (payload.length >= 2) {
      data.channel_1_threshold = readU16BE(payload, 0) / 8000;
    }
  } else if (index === 0x2A) {
    if (payload.length >= 2) {
      data.channel_2_threshold = readU16BE(payload, 0) / 8000;
    }
  }
  return data;
}

function decodeUplink(input) {
  var data = {};
  var bytes = input.bytes;
  if (input.fPort !== undefined && input.fPort !== null) {
    data.fport = input.fPort;
  }
  if (!bytes || bytes.length === 0) {
    return { data: data };
  }
  var type = bytes[0];
  if (type === 0x01) {
    if (bytes.length > 1) {
      var frame = decodeDataFrame(bytes[1], bytes.slice(2));
      var k;
      for (k in frame) {
        data[k] = frame[k];
      }
    }
  } else if (type === 0x02) {
    data.nack = true;
    if (bytes.length > 1) {
      data.nack_index = bytes[1];
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
