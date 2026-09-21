/**
 * Mutelcor LoRa Alarm Unit (MTC-AU01/02/03/04) uplink decoder
 *
 * Source: Mutelcor LoRaWAN Payload manual 1.6.0, section 2
 * Protocol: payload v2, big-endian
 *
 * Uplink frame types (OpCode at byte 3):
 *   0x00 Heartbeat       - 4 bytes: Version, Voltage, OpCode
 *   0x01 Button pressed  - 4 bytes: Version, Voltage, OpCode
 *   0x50 Alert status    - 5 bytes: + Duration (remaining alert duration in
 *     1 minute steps, 0 = no alert)
 *   0x50 Alert status    - 6 bytes: + Feedbacks, active alert feedbacks
 *     (Bit 0 = Feedback 1, Bit 1 = Feedback 2, Bit 2 = Feedback 3,
 *     Bit 3 = Feedback 4); only included when Duration not 0
 *
 * Voltage is in 0.01 V steps, i.e. 100 = 1.00 V.
 * Class C and Battery variants share the same payload structure.
 */

function decode(bytes) {
  var data = {};

  if (!bytes || bytes.length < 1) {
    return data;
  }

  data.version = bytes[0];

  if (bytes.length >= 3) {
    data.voltage = ((bytes[1] << 8) | bytes[2]) / 100;
  }

  if (bytes.length < 4) {
    return data;
  }

  data.op_code = bytes[3];

  if (bytes[3] === 0x50 && bytes.length >= 5) {
    data.duration = bytes[4];

    if (bytes[4] !== 0 && bytes.length >= 6) {
      var feedbacks = bytes[5];
      data.feedback_1 = (feedbacks >> 0) & 0x01;
      data.feedback_2 = (feedbacks >> 1) & 0x01;
      data.feedback_3 = (feedbacks >> 2) & 0x01;
      data.feedback_4 = (feedbacks >> 3) & 0x01;
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
