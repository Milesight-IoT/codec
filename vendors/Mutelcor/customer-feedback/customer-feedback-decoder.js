/**
 * Mutelcor Customer Feedback (MTC-XX-CF01) uplink decoder
 *
 * Source: Mutelcor LoRaWAN Payload manual 1.6.0, P4 section 3 "LoRa Customer Feedback",
 *         global NOTES P1, generic uplink payload description P13-16.
 *
 * Payload v2, Big-endian. Every message carries the battery voltage (P1 NOTES).
 *
 * Heartbeat (OpCode 0x00, 11 bytes for 3 buttons):
 *   byte 0      Version, uint8, always 2 (payload v2, P1 NOTES)
 *   byte 1-2    Voltage, uint16 BE, battery voltage in 0.01 V steps (100 = 1.00 V)
 *   byte 3      OpCode, 0x00 = Heartbeat, 0x02 = Votes
 *   byte 4      # Buttons, uint8, number of buttons
 *   byte 5..    Button totals, #Buttons * uint16 BE, totals per button since start/reset/rollover
 *
 * Votes (OpCode 0x02, 14 bytes for 3 buttons), sent on button press:
 *   as Heartbeat, followed by:
 *   tail        Button counts, #Buttons * uint8, counts per button since last votes uplink
 */

function cfNormalizeBytes(input) {
  var out = [];
  var i;
  if (input === null || input === undefined) {
    return out;
  }
  if (Array.isArray(input)) {
    return input;
  }
  if (ArrayBuffer.isView(input)) {
    return Array.prototype.slice.call(input);
  }
  if (typeof input === "string") {
    var compact = input.replace(/\s+/g, "");
    if (compact.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(compact)) {
      for (i = 0; i < compact.length; i += 2) {
        out.push(parseInt(compact.substr(i, 2), 16));
      }
      return out;
    }
    if (typeof atob === "function") {
      try {
        var raw = atob(input);
        for (i = 0; i < raw.length; i++) {
          out.push(raw.charCodeAt(i));
        }
      } catch (err) {
        return [];
      }
    }
  }
  return out;
}

function cfReadUint16(bytes, offset) {
  return bytes[offset] * 256 + bytes[offset + 1];
}

function cfToHex(value) {
  var hex = value.toString(16);
  if (hex.length < 2) {
    hex = "0" + hex;
  }
  return "0x" + hex;
}

function cfDecode(bytes) {
  var data = {};
  var warnings = [];

  if (bytes.length < 1) {
    warnings.push("empty payload");
    return { data: data, warnings: warnings };
  }

  data.version = bytes[0];

  if (bytes.length < 3) {
    warnings.push("payload too short for Voltage (bytes 1-2)");
    return { data: data, warnings: warnings };
  }
  data.voltage = cfReadUint16(bytes, 1) / 100;

  if (bytes.length < 4) {
    warnings.push("payload too short for OpCode (byte 3)");
    return { data: data, warnings: warnings };
  }
  data.op_code = bytes[3];

  if (data.op_code === 0x00) {
    data.op_code_name = "heartbeat";
  } else if (data.op_code === 0x02) {
    data.op_code_name = "votes";
  } else {
    warnings.push("unknown OpCode " + cfToHex(data.op_code) + " for Customer Feedback");
    if (bytes.length >= 5) {
      data.buttons_number = bytes[4];
    }
    return { data: data, warnings: warnings };
  }

  if (bytes.length < 5) {
    warnings.push("payload too short for # Buttons (byte 4)");
    return { data: data, warnings: warnings };
  }

  var numButtons = bytes[4];
  data.buttons_number = numButtons;

  var offset = 5;
  var i;
  for (i = 0; i < numButtons; i++) {
    if (offset + 1 < bytes.length) {
      data["button_total_" + (i + 1)] = cfReadUint16(bytes, offset);
      offset += 2;
    } else {
      warnings.push("payload too short for button_total_" + (i + 1));
    }
  }

  if (data.op_code === 0x02) {
    for (i = 0; i < numButtons; i++) {
      if (offset < bytes.length) {
        data["button_count_" + (i + 1)] = bytes[offset];
        offset += 1;
      } else {
        warnings.push("payload too short for button_count_" + (i + 1));
      }
    }
  }

  var expectedLength = 5 + numButtons * (data.op_code === 0x02 ? 3 : 2);
  if (bytes.length !== expectedLength) {
    warnings.push("unexpected payload length " + bytes.length + ", expected " + expectedLength + " for " + numButtons + " button(s)");
  }

  return { data: data, warnings: warnings };
}

function decodeUplink(input) {
  var raw = input && input.bytes !== undefined ? input.bytes : input;
  var result = cfDecode(cfNormalizeBytes(raw));
  return { data: result.data, warnings: result.warnings };
}

function Decode(fPort, bytes, variables) {
  return cfDecode(cfNormalizeBytes(bytes)).data;
}

function Decoder(bytes, fPort) {
  return cfDecode(cfNormalizeBytes(bytes)).data;
}
