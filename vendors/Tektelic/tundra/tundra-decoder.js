function toSigned(raw, bits) {
  if (bits === 16 && raw >= 0x8000) {
    return raw - 0x10000;
  }
  return raw;
}

function hexByte(b) {
  var h = "0123456789ABCDEF";
  return "0x" + h[(b >> 4) & 0x0F] + h[b & 0x0F];
}

function parseBlockFrame(bytes, i, out) {
  var channel = bytes[i];
  var type = bytes[i + 1];
  var len = 0;
  if (type === 0xFF || type === 0xD3 || type === 0xBD || type === 0x67 || type === 0x04 || type === 0x02) {
    len = 2;
  } else if (type === 0x68 || type === 0x00) {
    len = 1;
  } else if (type === 0x71) {
    len = 6;
  } else {
    return -1;
  }
  if (i + 2 + len > bytes.length) {
    return -1;
  }
  var raw16 = (bytes[i + 2] << 8) | bytes[i + 3];
  if (channel === 0x00 && type === 0xFF) {
    out.battery_voltage = toSigned(raw16, 16) * 0.01;
  } else if (channel === 0x00 && type === 0xD3) {
    out.rem_batt_capacity = bytes[i + 2];
  } else if (channel === 0x00 && type === 0xBD) {
    out.rem_batt_days = raw16;
  } else if (channel === 0x00 && type === 0x00) {
    out.acceleration_alarm = hexByte(bytes[i + 2]) === "0xFF" ? "0xFF" : (bytes[i + 2] === 0x00 ? "0x00" : hexByte(bytes[i + 2]));
  } else if (channel === 0x00 && type === 0x71) {
    var bx = (bytes[i + 2] << 8) | bytes[i + 3];
    var by = (bytes[i + 4] << 8) | bytes[i + 5];
    var bz = (bytes[i + 6] << 8) | bytes[i + 7];
    out.acceleration_x = toSigned(bx, 16) * 0.001;
    out.acceleration_y = toSigned(by, 16) * 0.001;
    out.acceleration_z = toSigned(bz, 16) * 0.001;
  } else if (channel === 0x0B && type === 0x67) {
    out.mcu_temperature = toSigned(raw16, 16) * 0.1;
  } else if (channel === 0x03 && type === 0x67) {
    out.ambient_temperature = toSigned(raw16, 16) * 0.1;
  } else if (channel === 0x04 && type === 0x68) {
    out.relative_humidity = bytes[i + 2] * 0.5;
  } else if (channel === 0x0E && type === 0x00) {
    out.ext_reed_switch_state = hexByte(bytes[i + 2]);
  } else if (channel === 0x0F && type === 0x04) {
    out.ext_reed_switch_count = raw16;
  } else if (channel === 0x02 && type === 0x02) {
    out.ext_probe_voltage = toSigned(raw16, 16) * 0.001;
  } else if (channel === 0x02 && type === 0x67) {
    out.ext_probe_temperature = toSigned(raw16, 16) * 0.1;
  }
  return 2 + len;
}

function parseBlockStream(bytes, start, out) {
  var i = start;
  while (i + 1 < bytes.length) {
    var consumed = parseBlockFrame(bytes, i, out);
    if (consumed < 0) {
      out.unparsed_data = bytes.slice(i).map(hexByte).join(" ");
      break;
    }
    i += consumed;
  }
}

function decodeUplink(input) {
  var bytes = input.bytes;
  var fPort = input.fPort !== undefined ? input.fPort : 10;
  var data = {};
  var i;

  if (fPort === 0) {
    return { data: {} };
  }

  if (fPort === 10) {
    parseBlockStream(bytes, 0, data);
    return { data: data };
  }

  if (fPort === 14) {
    var count = 0;
    for (i = 0; i + 1 < bytes.length && count < 8; i += 2) {
      count += 1;
      var tag = (bytes[i] << 8) | bytes[i + 1];
      data["bad_tag_" + count] = "0x" + ("0000" + tag.toString(16).toUpperCase()).slice(-4);
    }
    return { data: data };
  }

  if (fPort === 32) {
    data.tag_number = (bytes[0] << 8) | bytes[1];
    parseBlockStream(bytes, 2, data);
    return { data: data };
  }

  if (fPort === 33) {
    data.tag_number = (bytes[0] << 8) | bytes[1];
    data.size = bytes[2];
    var remaining = bytes.length - 3;
    data.fragmented = data.size !== remaining;
    parseBlockStream(bytes, 3, data);
    return { data: data };
  }

  if (fPort === 34) {
    data.fragment_data = bytes.map(hexByte).join(" ");
    return { data: data };
  }

  if (fPort === 100) {
    if (bytes.length > 4) {
      var crc = ((bytes[0] << 24) >>> 0) + (bytes[1] << 16) + (bytes[2] << 8) + bytes[3];
      data.crc32 = crc >>> 0;
      data.crc32_hex = ("00000000" + (crc >>> 0).toString(16).toUpperCase()).slice(-8);
      data.register_values = bytes.slice(4).map(hexByte).join(" ");
    } else {
      data.register_values = bytes.map(hexByte).join(" ");
    }
    return { data: data };
  }

  return { data: {} };
}

function decodeDownlink(input) {
  var bytes = input.bytes;
  var fPort = input.fPort;
  var data = {};

  if (fPort === 99) {
    data.command = "DEEP_SLEEP";
    return { data: data };
  }

  if (fPort === 100) {
    var i = 0;
    var blocks = [];
    while (i < bytes.length) {
      var isWrite = (bytes[i] & 0x80) !== 0;
      var address = bytes[i] & 0x7F;
      if (isWrite) {
        blocks.push({ address: address, write: true, value_hex: bytes.slice(i + 1).map(hexByte).join(" ") });
        break;
      } else {
        blocks.push({ address: address, write: false });
        i += 1;
      }
    }
    data.register_blocks = blocks;
    return { data: data };
  }

  if (fPort >= 112 && fPort <= 122) {
    data.start_tag = (bytes[0] << 8) | bytes[1];
    data.request_port = fPort;
    return { data: data };
  }

  return { data: {} };
}

function consume(input) {
  return { data: {}, errors: ["unsupported"] };
}
