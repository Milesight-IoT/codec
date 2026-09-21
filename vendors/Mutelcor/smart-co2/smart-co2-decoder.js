// Mutelcor Smart CO2 (MTC-CO2-01/02/03/04) uplink decoder
// Payload v2, Big-endian. Source: Mutelcor payload manual, Smart CO2 chapter (P5) + global NOTES (P1).
//
// Uplink frame: Version(1B, always 2) + Voltage(2B uint16, 0.01 V steps) + OpCode(1B).
// Battery voltage is included in every message.
// OpCode 0x01 Alarm: fixed 4 bytes, no measurement fields.
// OpCode 0x03 Measurements: + Measurements bitmask(1B) + conditional fields.
// OpCode 0x05 Thresholds: same as Measurements + Threshold Info(1B) at the end.
// Measurements bitmask: Bit 0 = Temperature, Bit 1 = Relative Humidity, Bit 4 = CO2.
// Temperature: int16 in 0.1 degC steps; Relative Humidity: uint8 %; CO2: uint16 ppm.
// Threshold Info: Bit 0-3 = Trigger threshold 1-4, Bit 4-7 = Stop threshold 1-4.

function readUint16(bytes, offset) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readInt16(bytes, offset) {
  var raw = readUint16(bytes, offset);
  if (raw >= 0x8000) {
    raw -= 0x10000;
  }
  return raw;
}

function decodeSmartCo2(bytes) {
  var data = {};
  var opCode = bytes[3];

  data.version = bytes[0];
  data.voltage = readUint16(bytes, 1) * 0.01;
  data.op_code = opCode;

  if (opCode !== 0x03 && opCode !== 0x05) {
    return data;
  }

  if (bytes.length < 5) {
    return data;
  }

  var bitmask = bytes[4];
  var offset = 5;

  if (bitmask & 0x01) {
    if (bytes.length >= offset + 2) {
      data.temperature = readInt16(bytes, offset) / 10;
      offset += 2;
    }
  }
  if (bitmask & 0x02) {
    if (bytes.length >= offset + 1) {
      data.humidity = bytes[offset];
      offset += 1;
    }
  }
  if (bitmask & 0x10) {
    if (bytes.length >= offset + 2) {
      data.co2 = readUint16(bytes, offset);
      offset += 2;
    }
  }

  if (opCode === 0x05 && bytes.length >= offset + 1) {
    var info = bytes[offset];
    data.trigger_1 = (info & 0x01) !== 0;
    data.trigger_2 = (info & 0x02) !== 0;
    data.trigger_3 = (info & 0x04) !== 0;
    data.trigger_4 = (info & 0x08) !== 0;
    data.stop_1 = (info & 0x10) !== 0;
    data.stop_2 = (info & 0x20) !== 0;
    data.stop_3 = (info & 0x40) !== 0;
    data.stop_4 = (info & 0x80) !== 0;
  }

  return data;
}

function decodeUplink(input) {
  var bytes = input ? input.bytes : null;
  if (!bytes || bytes.length < 4) {
    return { errors: ["payload must contain at least Version(1B) + Voltage(2B) + OpCode(1B) = 4 bytes"] };
  }
  return { data: decodeSmartCo2(bytes) };
}

function Decode(fPort, bytes, variables) {
  return decodeUplink({ bytes: bytes, fPort: fPort }).data;
}

function Decoder(bytes, fPort) {
  return decodeUplink({ bytes: bytes, fPort: fPort }).data;
}
