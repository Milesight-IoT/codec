// Source: Sontay RF-LW-WD-AM LoRaWAN Water Detection (enLink Status-L OEM, firmware FW-STS-L)
// Format: enLink TLV uplink - records of [type byte][value bytes], default fPort 1
// Spec: Synetica enLink LoRaWAN payload specification (official README, MIT); Sontay RF-LW-WD-AM user guide / datasheet
function _s16(hi, lo) {
  var v = (hi << 8) | lo;
  return v >= 0x8000 ? v - 0x10000 : v;
}
function _u16(hi, lo) {
  return ((hi << 8) | lo) >>> 0;
}
function _u32(b0, b1, b2, b3) {
  return (((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0);
}
function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || !bytes.length) return out;
  var hex = [];
  for (var h = 0; h < bytes.length; h++) hex.push(('0' + bytes[h].toString(16)).slice(-2).toUpperCase());
  out.raw_uplink = hex.join('');
  var i = 0;
  while (i < bytes.length) {
    var t = bytes[i];
    if (t === 0x00) {
      if (bytes[i + 1] === 0x00 && i + 3 < bytes.length) {
        out.firmware_version = bytes[i + 2] + '.' + bytes[i + 3];
        i += 4;
      } else {
        i += 2;
      }
    } else if (t === 0xA5) {
      var ok = bytes[i + 1] === 0x06;
      var cmd = ('0' + bytes[i + 2].toString(16)).slice(-2).toUpperCase();
      out.ack = (ok ? 'ACK 0x' : 'NACK 0x') + cmd;
      i += 3;
    } else if (t === 0x01 && i + 2 < bytes.length) {
      out.temperature = _s16(bytes[i + 1], bytes[i + 2]) / 10;
      i += 3;
    } else if (t === 0x02 && i + 1 < bytes.length) {
      out.humidity = bytes[i + 1];
      i += 2;
    } else if (t === 0x30 && i + 2 < bytes.length) {
      out.leak_resistance = _u16(bytes[i + 1], bytes[i + 2]) / 10;
      i += 3;
    } else if (t === 0x31 && i + 1 < bytes.length) {
      out.leak_detected = bytes[i + 1] ? 1 : 0;
      i += 2;
    } else if (t === 0x4E && i + 2 < bytes.length) {
      out.cpu_temperature = _s16(bytes[i + 1], bytes[i + 2]) / 10;
      i += 3;
    } else if (t === 0x42 && i + 2 < bytes.length) {
      out.battery_voltage = Math.round(_u16(bytes[i + 1], bytes[i + 2]) / 10) / 100;
      i += 3;
    } else if (t === 0x41 && i + 1 < bytes.length) {
      out.battery_status = bytes[i + 1];
      i += 2;
    } else if (t === 0x4D && i + 4 < bytes.length) {
      // KPI: air intake fan runtime U32 seconds
      out.fan_runtime = _u32(bytes[i + 1], bytes[i + 2], bytes[i + 3], bytes[i + 4]);
      i += 5;
    } else {
      break; // unknown type, cannot determine record length
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
