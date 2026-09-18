// BC107 / MC6-162 fan-coil thermostat LoRaWAN downlink encoder
// Source: vendor protocol doc "MC6-162-LoRawan protocal-26byes-20260917.pdf", section
// "2. Downlink data to thermostat". Frame = header(1) + length(1) + data.
// On successful receipt the device re-uplinks the basic frame after ~10 s.
//
//   header  len  data
//   0x00    1    on/off:        0=Off 1=On
//   0x01    1    fan speed:     0=High 1=Med 2=Low 3=Auto
//   0x02    1    work mode:     0=Off 1=Cool 2=Heat 3=Vent 4=Dehumidify 5=Auto (wire codes)
//   0x03    2    setpoint:      0.1 degC/LSB, big-endian
//   0x04    1    lock status:   0=Unlocked 1=Locked
//   0x05    4    lock pin:      one decimal digit per byte
//   0x07    1    schedule mode: 0=Weekday/Weekend 1=7 Days 2=24 Hrs 3=None
//   0x08    1    switch diff:   0.1 degC/LSB, raw 5/10/15/20 = 0.5/1.0/1.5/2.0 degC
//
// Input object keys use the uplink/codec value tables. system_mode is the one field
// whose wire coding differs between directions (uplink 0=Heat 5=Off vs downlink
// 0=Off 5=Auto), so this encoder translates the codec value (0=Heat 1=Cool 2=Vent
// 3=Dehumidify 4=Auto 5=Off) to the downlink wire code.
//
// Several keys in one object are concatenated into one payload (frames are
// self-delimiting via the length byte), but multi-command downlinks are not covered
// by the vendor doc — prefer one command per downlink until the vendor confirms.
//
// raw_downlink bypasses all of the above: "030200F0" sends those hex bytes as-is,
// an optional ":port" suffix sets fPort ("030200F0:2", default 1).

function encodePin(value) {
  var s = String(value);
  if (!/^\d{4}$/.test(s)) {
    throw new Error("lock_pin_number must be exactly 4 digits, got: " + s);
  }
  var out = [0x05, 0x04];
  for (var i = 0; i < 4; i++) {
    out.push(parseInt(s.charAt(i), 10));
  }
  return out;
}

// codec value (uplink table) -> downlink wire code
var SYSTEM_MODE_WIRE = { 0: 0x02, 1: 0x01, 2: 0x03, 3: 0x04, 4: 0x05, 5: 0x00 };

function deviceEncode(obj) {
  var bytes = [];
  if (!obj) {
    return bytes;
  }
  if ("on_off_status" in obj) {
    bytes = bytes.concat([0x00, 0x01, obj.on_off_status ? 1 : 0]);
  }
  if ("fan" in obj) {
    bytes = bytes.concat([0x01, 0x01, obj.fan & 0xFF]);
  }
  if ("system_mode" in obj) {
    var wire = SYSTEM_MODE_WIRE[obj.system_mode];
    if (wire === undefined) {
      throw new Error("system_mode must be 0..5 (0=Heat 1=Cool 2=Vent 3=Dehumidify 4=Auto 5=Off), got: " + obj.system_mode);
    }
    bytes = bytes.concat([0x02, 0x01, wire]);
  }
  if ("setpoint" in obj) {
    var raw = Math.round(Number(obj.setpoint) * 10);
    if (raw < 0 || raw > 0xFFFF) {
      throw new Error("setpoint out of range: " + obj.setpoint);
    }
    bytes = bytes.concat([0x03, 0x02, (raw >> 8) & 0xFF, raw & 0xFF]);
  }
  if ("lock_out_status" in obj) {
    bytes = bytes.concat([0x04, 0x01, obj.lock_out_status ? 1 : 0]);
  }
  if ("lock_pin_number" in obj) {
    bytes = bytes.concat(encodePin(obj.lock_pin_number));
  }
  if ("schedule_mode" in obj) {
    bytes = bytes.concat([0x07, 0x01, obj.schedule_mode & 0xFF]);
  }
  if ("switching_diff" in obj) {
    var diff = Math.round(Number(obj.switching_diff) * 10);
    if (diff !== 5 && diff !== 10 && diff !== 15 && diff !== 20) {
      throw new Error("switching_diff must be 0.5, 1, 1.5 or 2 (degC), got: " + obj.switching_diff);
    }
    bytes = bytes.concat([0x08, 0x01, diff]);
  }
  return bytes;
}

function hexToBytes(hex) {
  hex = String(hex).replace(/[^0-9a-fA-F]/g, "");
  if (hex.length % 2) {
    hex = "0" + hex;
  }
  var out = [];
  for (var i = 0; i < hex.length; i += 2) {
    out.push(parseInt(hex.substr(i, 2), 16));
  }
  return out;
}

function encodeRaw(obj) {
  var raw = obj && (obj.raw_downlink !== undefined ? obj.raw_downlink : obj);
  if (typeof raw !== "string" || !raw) {
    return { bytes: [], fPort: 1 };
  }
  var parts = raw.split(":");
  return {
    bytes: hexToBytes(parts[0]),
    fPort: parts[1] ? parseInt(parts[1], 10) : 1
  };
}

function encodeInput(input) {
  var obj = input && input.data !== undefined ? input.data : input;
  if (obj && typeof obj === "object" && "raw_downlink" in obj) {
    return encodeRaw(obj);
  }
  return { bytes: deviceEncode(obj), fPort: input && input.fPort ? Number(input.fPort) : 1 };
}

// ChirpStack v3 / Milesight gateway codec
function Encode(fPort, obj) {
  return encodeInput({ data: obj, fPort: fPort }).bytes;
}

// TTN / ChirpStack v3 (alternate signature)
function Encoder(obj, port) {
  return encodeInput({ data: obj, fPort: port }).bytes;
}

// ChirpStack v4
function encodeDownlink(input) {
  return encodeInput(input);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    deviceEncode: deviceEncode,
    encodeDownlink: encodeDownlink,
    Encode: Encode,
    Encoder: Encoder
  };
}
