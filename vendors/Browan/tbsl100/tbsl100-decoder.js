// Source: Browan TBSL100 Sound Level Sensor Reference Manual (DOC ver. BQW_02_0011.002, 2020)
// Sections: 4.1 Status Payload (port 105, 4 bytes), Appendix Configuration Downlink
// Command / Response Content (port 204, 8 bytes), Appendix Frame Count 0 Content (17 bytes).
// Family conventions: little-endian multi-byte values; battery voltage V = (25 + n) / 10;
// PCB NTC temperature degC = n - 32.

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || !bytes.length) return out;

  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    hex += ('0' + bytes[i].toString(16)).slice(-2);
  }
  out.raw_uplink = hex.toUpperCase();

  if (fPort === 105 && bytes.length >= 4) {
    // Bit[0]: 0 = keep alive, 1 = trigger threshold event; Bits[7:1] RFU
    out.threshold_event = bytes[0] & 0x01 ? 1 : 0;
    // Bits[3:0]: battery level 1-14, voltage in V = (25 + n) / 10; Bits[7:4] RFU
    out.battery_voltage = (25 + (bytes[1] & 0x0f)) / 10;
    // Bits[6:0]: unsigned 0-127, degC = n - 32; Bit[7] RFU
    out.temp_pcb = (bytes[2] & 0x7f) - 32;
    // Bits[7:0]: decibel value 40-100 dBA; 0xFF = sensor could not measure
    out.sound_level = bytes[3] === 0xff ? null : bytes[3];
  } else if (fPort === 204 && bytes.length === 17) {
    // Frame Count 0 diagnostic: cmd id + 4 x uint32 little-endian
    out.bootloader_version = bytes[1] | (bytes[2] << 8) | (bytes[3] << 16) | (bytes[4] << 24);
    out.hardware_id = bytes[5] | (bytes[6] << 8) | (bytes[7] << 16) | (bytes[8] << 24);
    var crc = ((bytes[9] | (bytes[10] << 8) | (bytes[11] << 16) | (bytes[12] << 24)) >>> 0).toString(16);
    var key = ((bytes[13] | (bytes[14] << 8) | (bytes[15] << 16) | (bytes[16] << 24)) >>> 0).toString(16);
    out.firmware_crc = ('00000000' + crc).slice(-8).toUpperCase();
    out.pubkey_id = ('00000000' + key).slice(-8).toUpperCase();
  } else if (fPort === 204 && bytes.length >= 6) {
    // Configuration response: concatenated commands, 0x00/0x01 carry 2-byte LE, 0x02 carries 1 byte
    var p = 0;
    while (p < bytes.length) {
      var cmd = bytes[p];
      if (cmd === 0x00 && p + 2 < bytes.length) {
        out.keep_alive_interval = bytes[p + 1] | (bytes[p + 2] << 8);
        p += 3;
      } else if (cmd === 0x01 && p + 2 < bytes.length) {
        out.detection_interval = bytes[p + 1] | (bytes[p + 2] << 8);
        p += 3;
      } else if (cmd === 0x02 && p + 1 < bytes.length) {
        out.decibel_threshold = bytes[p + 1];
        p += 2;
      } else {
        break;
      }
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
