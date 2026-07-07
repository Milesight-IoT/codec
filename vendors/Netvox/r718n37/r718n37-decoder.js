function decode(bytes, fPort) {
  var b = bytes;
  var d = {};
  if (fPort === 6) {
    if (b[2] === 0x00) {
      d.sw_version = b[3] / 10;
      d.hw_version = b[4];
      d.datecode = ('0' + b[5].toString(16)).slice(-2) + ('0' + b[6].toString(16)).slice(-2) + ('0' + b[7].toString(16)).slice(-2) + ('0' + b[8].toString(16)).slice(-2);
      return d;
    }
    var v;
    if (b[3] & 0x80) {
      v = (b[3] & 0x7F) / 10;
    } else {
      v = b[3] / 10;
    }
    d.battery_voltage = v;
    var map = {
      0: 1,
      1: 5,
      2: 10,
      3: 100
    };
    var rt = b[2];
    if (rt === 0x01) {
      d.phase1_raw_current = (b[4] << 8 | b[5]);
      d.phase2_raw_current = (b[6] << 8 | b[7]);
      d.phase3_raw_current = (b[8] << 8 | b[9]);
      d.phase1_multiplier = b[10];
    } else if (rt === 0x02) {
      d.phase2_multiplier = b[4];
      d.phase3_multiplier = b[5];
    } else if (rt === 0x03) {
      d.phase1_raw_current = (b[4] << 8 | b[5]);
      d.phase2_raw_current = (b[6] << 8 | b[7]);
      d.phase3_raw_current = (b[8] << 8 | b[9]);
      d.phase1_multiplier = map[b[10] & 3];
      d.phase2_multiplier = map[(b[10] >> 2) & 3];
      d.phase3_multiplier = map[(b[10] >> 4) & 3];
    } else if (rt === 0x04) {
      d.low_current1_alarm = b[4] & 1;
      d.high_current1_alarm = (b[4] >> 1) & 1;
      d.low_current2_alarm = (b[4] >> 2) & 1;
      d.high_current2_alarm = (b[4] >> 3) & 1;
      d.low_current3_alarm = (b[4] >> 4) & 1;
      d.high_current3_alarm = (b[4] >> 5) & 1;
    }
    return d;
  }
  if (fPort === 7) {
    d.cmd_id = b[0];
    return d;
  }
  return d;
}

function decodeUplink(input) {
  return {
    data: decode(input.bytes, input.fPort)
  };
}

function Decode(fPort, bytes) {
  return decode(bytes, fPort);
}

function Decoder(bytes, port) {
  return decode(bytes, port);
}
