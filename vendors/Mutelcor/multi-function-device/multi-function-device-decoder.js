// Mutelcor LoRa Multi-Function Device MTC-XX-MF01 uplink decoder
// Source: Mutelcor LoRa payload manual v2, chapter "LoRa Multi-Function Device MTC-XX-MF01" (pages 7-8)
// Message layout (Big-endian):
//   Position 1: Version ("Always 2")
//   Position 2-3: Voltage ("[V] in 0.01 V steps, i.e. 100 = 1.00 V")
//   Position 4: OpCode ("03 = no switch change, 05 = additional switch change, 06 = main switch change")
//   Position 5: Measurements bitmask ("Bit 7 (MSB) = More")
//   Position 6: Measurements 2 bitmask ("Digital Inputs. Only included when More bit set in Measurements")
//   Position 7: Digital Inputs ("Bit 0-3: Enabled Digital Inputs 1-4", "Bit 4-7: Value Digital Inputs 1-4")
//   Position 8: Threshold Info ("Bit 0-3: Trigger threshold 1-4", "Bit 4-7: Stop threshold 1-4", only OpCode 0x05)
//   Last position: Main Switch state ("The last position indicates the state of the main switch: Value 0: Open, Value 1: Closed")


function decodeMf01Uplink(bytes) {
  var data = {};
  if (!bytes || bytes.length < 1) {
    return data;
  }


  data.version = bytes[0];
  if (bytes.length < 3) {
    return data;
  }


  data.voltage = ((bytes[1] << 8) | bytes[2]) / 100;
  if (bytes.length < 4) {
    return data;
  }


  data.op_code = bytes[3];

  var opCode = bytes[3];
  var offset = 4;

  if (opCode === 3 || opCode === 5) {
    if (bytes.length < offset + 1) {
      return data;
    }

    var measurements = bytes[offset];
    offset += 1;

    if ((measurements & 0x80) !== 0) {
      if (bytes.length < offset + 1) {
        return data;
      }

      var measurements2 = bytes[offset];
      offset += 1;

      if ((measurements2 & 0x01) !== 0) {
        if (bytes.length < offset + 1) {
          return data;
        }

        var digitalInputs = bytes[offset];
        offset += 1;

        data.digital_input_enabled_1 = digitalInputs & 0x01;
        data.digital_input_enabled_2 = (digitalInputs >> 1) & 0x01;
        data.digital_input_enabled_3 = (digitalInputs >> 2) & 0x01;
        data.digital_input_enabled_4 = (digitalInputs >> 3) & 0x01;
        data.digital_input_value_1 = (digitalInputs >> 4) & 0x01;
        data.digital_input_value_2 = (digitalInputs >> 5) & 0x01;
        data.digital_input_value_3 = (digitalInputs >> 6) & 0x01;
        data.digital_input_value_4 = (digitalInputs >> 7) & 0x01;
      }
    }

    if (opCode === 5) {
      if (bytes.length < offset + 1) {
        return data;
      }

      var thresholdInfo = bytes[offset];
      offset += 1;

      data.trigger_1 = thresholdInfo & 0x01;
      data.trigger_2 = (thresholdInfo >> 1) & 0x01;
      data.trigger_3 = (thresholdInfo >> 2) & 0x01;
      data.trigger_4 = (thresholdInfo >> 3) & 0x01;
      data.stop_1 = (thresholdInfo >> 4) & 0x01;
      data.stop_2 = (thresholdInfo >> 5) & 0x01;
      data.stop_3 = (thresholdInfo >> 6) & 0x01;
      data.stop_4 = (thresholdInfo >> 7) & 0x01;
    }
  }

  if (bytes.length >= offset + 1) {
    data.main_switch_state = bytes[bytes.length - 1];
  }

  return data;
}


function decodeUplink(input) {
  var bytes = (input && input.bytes) ? input.bytes : [];
  return {
    data: decodeMf01Uplink(bytes)
  };
}


function Decode(fPort, bytes) {
  return decodeMf01Uplink(bytes);
}


function Decoder(bytes, fPort) {
  return decodeMf01Uplink(bytes);
}
