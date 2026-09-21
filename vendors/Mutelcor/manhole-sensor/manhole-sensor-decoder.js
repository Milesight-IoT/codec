// Mutelcor LoRa Manhole Sensor (MTC-MH01, manual naming MTC-XX-MH01) uplink payload decoder
// Payload v2, big-endian.
// Single uplink frame type, fixed 5 bytes:
// [0] Version (always 2), [1-2] Voltage (uint16, 0.01 V steps, i.e. 100 = 1.00 V),
// [3] OpCode (0x06 = Switch, sent on switch state change; 0x07 = Reminder, sent periodically),
// [4] Switch state (0x00 = Switch Off = manhole closed, 0x01 = Switch On = manhole open).

function readUint16(bytes, offset) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function decode(bytes) {
  var data = {};
  if (!bytes || bytes.length < 1) {
    return data;
  }
  data.version = bytes[0];
  if (bytes.length >= 3) {
    data.voltage = readUint16(bytes, 1) / 100;
  }
  if (bytes.length < 4) {
    return data;
  }
  var opCode = bytes[3];
  data.op_code = opCode;
  if (opCode === 0x06) {
    data.frame_type = 'switch';
  } else if (opCode === 0x07) {
    data.frame_type = 'reminder';
  } else {
    data.frame_type = 'unknown';
    return data;
  }
  if (bytes.length >= 5) {
    data.switch_state = bytes[4];
  }
  return data;
}

function decodeUplink(input) {
  return { data: decode(input.bytes) };
}

function Decode(fPort, bytes) {
  return decode(bytes);
}

function Decoder(bytes, port) {
  return decode(bytes);
}
