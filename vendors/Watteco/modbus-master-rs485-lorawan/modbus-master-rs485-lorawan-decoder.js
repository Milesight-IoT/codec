// Watteco Modbus Master RS485 / LoRaWAN bridge uplink decoder.
// Source: installer notice 50-70-080-165-176-177-181-182 (Modbus Master sensor):
// https://support.watteco.com/wp-content/uploads/2021/03/50-70-080-165-176-177-181-182-Capteur-Modbus-Master_Notice-Installateur_V1.2.pdf
// Serial Master/Slave Protocol cluster 0x8007: https://support.watteco.com/serial-masterslave-protocol-cluster/
// Multi Master/Slave Answers cluster 0x8009: https://support.watteco.com/multi-masterslave-answers-cluster/
// // Cleanroom implementation: frame layout derived solely from the vendor documentation

// Uplink reports on port 125: <0x11><0x0A><CID><AID><0x41><ss><answer bytes>.
// Cluster 0x8007 attribute 0x0001: last Modbus answer, size-prefixed; the Modbus CRC is
// verified by the sensor and not included in the answer.
// Cluster 0x8009 attribute 0x0000: aggregated answers of the last exchange cycle -
// size byte, 3-byte data descriptor (8-bit cyclic series counter | 3-bit frame number |
// 3-bit last frame index | 10-bit endpoint presence bitmap, big endian), then the answer
// bytes ordered by lowest set bit of the bitmap (Modbus headers kept or stripped
// depending on the Header option attribute 0x0001). Frames longer than 51 bytes are
// split across a series.
function _hex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16)).slice(-2);
  return s.toUpperCase();
}
function _u8(b, o) { return b[o]; }
function _i8(b, o) { return (b[o] << 24 >> 24); }
function _u16(b, o) { return (b[o] << 8) | b[o + 1]; }
function _i16(b, o) { var v = _u16(b, o); return v >= 0x8000 ? v - 0x10000 : v; }
function _u24(b, o) { return (b[o] << 16) | (b[o + 1] << 8) | b[o + 2]; }
function _i24(b, o) { var v = _u24(b, o); return v >= 0x800000 ? v - 0x1000000 : v; }
function _u32(b, o) { return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0; }
function _i32(b, o) { return (b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]; }
function _f32(b, o) {
  var sign = b[o] & 0x80 ? -1 : 1;
  var exp = ((b[o] & 0x7f) << 1) | (b[o + 1] >> 7);
  var man = ((b[o + 1] & 0x7f) << 16) | (b[o + 2] << 8) | b[o + 3];
  if (exp === 0 && man === 0) return 0.0;
  if (exp === 255) return man ? NaN : sign * Infinity;
  return sign * Math.pow(2, exp - 127) * (1 + man / 0x800000);
}
function _bcd(v) { return ((v >> 4) * 10) + (v & 0x0f); }
function _pad(n) { return n < 10 ? '0' + n : '' + n; }
function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 8) return out;
  out.raw_uplink = _hex(bytes);
  if (bytes[1] !== 0x0A) return out;
  var cid = _u16(bytes, 2);
  var aid = _u16(bytes, 4);
  if (bytes[6] !== 0x41) return out;
  var sz = bytes[7];
  var end = Math.min(8 + sz, bytes.length);
  if (cid === 0x8007 && aid === 0x0001 && end > 8) {
    out.modbus_answer = _hex(bytes.slice(8, end));
  } else if (cid === 0x8009 && aid === 0x0000 && end >= 12) {
    out.frame_series_counter = bytes[8];
    out.frame_number = (bytes[9] >> 5) & 0x07;
    out.frame_last_index = (bytes[9] >> 2) & 0x07;
    out.endpoint_bitmap = ((bytes[9] & 0x03) << 8) | bytes[10];
    out.modbus_answers = _hex(bytes.slice(11, end));
  }
  return out;
}
function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
