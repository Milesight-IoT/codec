// Mutelcor LoRa Panic Button (MTC-PB01 / MTC-PB02) uplink payload decoder
// Payload v2, big-endian.
// Uplink frames per manual: Heartbeat 0x00 (4 bytes),
// Alarm 0x01 (4 bytes, or 6 bytes with Alarm ID when alarm confirm is configured).
// Frame layout: [0] Version (always 2), [1-2] Voltage (uint16, 0.01 V steps),
// [3] OpCode, [4-5] Alarm ID (only Alarm with confirm).

function readUint16(bytes, offset) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function decode(bytes) {
  var data = {};
  if (!bytes || bytes.length < 1) {
    return data;
  }
  data.version = bytes[0];
  if (bytes.length >= 4 && bytes[1] === 0x60) {
    data.op_code = bytes[1];
    data.frame_type = 'alarm_confirm';
    data.alarm_id = readUint16(bytes, 2);
    return data;
  }
  if (bytes.length >= 3) {
    data.voltage = readUint16(bytes, 1) / 100;
  }
  if (bytes.length < 4) {
    return data;
  }
  var opCode = bytes[3];
  data.op_code = opCode;
  if (opCode === 0x00) {
    data.frame_type = 'heartbeat';
  } else if (opCode === 0x01) {
    data.frame_type = 'alarm';
    if (bytes.length >= 6) {
      data.alarm_id = readUint16(bytes, 4);
    }
  } else {
    data.frame_type = 'unknown';
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
