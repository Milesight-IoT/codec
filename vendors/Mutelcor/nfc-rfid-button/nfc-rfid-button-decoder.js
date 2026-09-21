// Mutelcor NFC RFID LoRa Button (MTC-NFC01 / MTC-NFC02) payload decoder
// Payload v2, big-endian.
// Uplink frames per manual: Heartbeat OpCode 0x00 (4 bytes),
// Alarm OpCode 0x01 (8 bytes fixed header + tail: 1 byte UID Error when
// UID Type is 0xFF, or variable-length UID of 1-10 bytes otherwise, so 9-18 bytes).
// Uplink layout: [0] Version (always 2), [1-2] Voltage (uint16, 0.01 V steps),
// [3] OpCode (0x00 Heartbeat, 0x01 Alarm), [4] Alarm Bitmask (0x01 Button 1 pressed,
// 0x02 Button 2 pressed), [5-6] Alarm ID (uint16, unique ID of the triggered Alarm),
// [7] UID Type, [8...] UID (when UID Type NOT 0xFF, starts at position 8 and goes
// until the end of the payload) or UID Error (when UID Type is 0xFF).
// Downlink to port 1: [0] Version (always 2), [1] OpCode 0x60 Alarm confirm,
// [2-3] Alarm ID (should match Alarm ID from Alarm upload).
// UID Type values: 0x00 ISO/IEC14443-4A, 0x01 FeliCa 212 kbps, 0x02 FeliCa 424 kbps,
// 0x03 ISO/IEC14443-4B, 0x04 Innovision Jewel/Topaz tag, 0x10 Mifare (ISO/IEC14443-4A),
// 0x11 FeliCa 212 kbps, 0x12 FeliCa 424 kbps, 0x20 ISO/IEC14443-4A, 0x23 ISO/IEC14443-4B,
// 0x40 DEP passive 106 kbps, 0x41 DEP passive 212 kbps, 0x42 DEP passive 424 kbps,
// 0x80 DEP active 106 kbps, 0x81 DEP active 212 kbps, 0x82 DEP active 424 kbps,
// 0xFF Error reading the Tag.
// UID Error values: 0x20 Reader not found at startup, 0x30 No tag/card found,
// 0x40 Reader communication error, 0x50 Tag/card read error (can be caused by low voltage),
// 0x60 Tag/card read error, 0x70 Multiple tags/cards, 0x90 Tag/card not supported,
// 0xA0 Reading tag/card interrupted, 0xB0 UID too long (max 10),
// 0xC0 Tag/card with random UID.
// UID byte order direction is not specified in the manual; uid_hex is the raw
// byte sequence as transmitted, uppercase hex, no reversal.

function readUint16(bytes, offset) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function toHexUpper(bytes, offset) {
  var hex = '';
  for (var i = offset; i < bytes.length; i++) {
    hex += ('0' + bytes[i].toString(16)).slice(-2).toUpperCase();
  }
  return hex;
}

function decode(bytes) {
  var data = {};
  if (!bytes || bytes.length < 1) {
    return data;
  }
  data.version = bytes[0];
  if (bytes.length >= 2 && bytes[1] === 0x60) {
    data.op_code = bytes[1];
    data.frame_type = 'alarm_confirm';
    if (bytes.length >= 4) {
      data.alarm_id = readUint16(bytes, 2);
    }
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
    return data;
  }
  if (opCode !== 0x01) {
    data.frame_type = 'unknown';
    return data;
  }
  data.frame_type = 'alarm';
  if (bytes.length >= 5) {
    data.alarm_bitmask = bytes[4];
  }
  if (bytes.length >= 7) {
    data.alarm_id = readUint16(bytes, 5);
  }
  if (bytes.length >= 8) {
    data.uid_type = bytes[7];
    if (data.uid_type === 0xFF) {
      if (bytes.length >= 9) {
        data.uid_error = bytes[8];
      }
    } else if (bytes.length >= 9) {
      data.uid_hex = toHexUpper(bytes, 8);
    }
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
