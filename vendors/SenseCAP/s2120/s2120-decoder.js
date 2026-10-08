// Source: SenseCAP S2120 LoRaWAN 8-in-1 Weather Station User Guide (Seeed Studio),
// section 10 "Packet Parsing" / "Data Parsing Example" - frame layout and sample
// values independently reimplemented from the manual tables only.
// All values big-endian. Frames are concatenated in one uplink:
//   0x01/0x4A (11B): int16 temp /10, uint8 humidity, uint32 light, uint8 uv /10,
//                    uint16 wind speed /10
//   0x02/0x4B (9B):  uint16 wind direction (deg), uint32 rainfall /1000 (mm/h),
//                    uint16 pressure *10 (Pa)
//   0x4C (7B):       uint16 peak wind gust /10, uint32 cumulative rainfall /1000
//   0x03 (2B):       uint8 battery level (0 = low, 100 = sufficient)
//   0x04 (10B):      uint8 battery, uint32 hw.hw-sw.sw version, uint16 measurement
//                    uplink interval (min), uint16 gps uplink interval (min)
//   0x05 (5B):       uint16 measurement interval, uint16 gps interval
//   0x06 (2B):       uint8 error code

function _hex(bytes) {
  var out = '';
  for (var i = 0; i < bytes.length; i++) {
    out += ('0' + bytes[i].toString(16).toUpperCase()).slice(-2);
  }
  return out;
}

function _be16(b, o) {
  var v = (b[o] << 8) | b[o + 1];
  if (v & 0x8000) v -= 0x10000;
  return v;
}

function _be32(b, o) {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 2) return out;
  out.raw_uplink = _hex(bytes);
  var i = 0;
  while (i < bytes.length) {
    var pid = bytes[i];
    if ((pid === 0x01 || pid === 0x4A) && i + 10 < bytes.length) {
      out.air_temperature = _be16(bytes, i + 1) / 10;
      out.air_humidity = bytes[i + 3];
      out.light_intensity = _be32(bytes, i + 4);
      out.uv_index = bytes[i + 8] / 10;
      out.wind_speed = ((bytes[i + 9] << 8) | bytes[i + 10]) / 10;
      i += 11;
    } else if ((pid === 0x02 || pid === 0x4B) && i + 8 < bytes.length) {
      out.wind_direction = (bytes[i + 1] << 8) | bytes[i + 2];
      out.rainfall_intensity = _be32(bytes, i + 3) / 1000;
      out.barometric_pressure = ((bytes[i + 7] << 8) | bytes[i + 8]) * 10;
      i += 9;
    } else if (pid === 0x4C && i + 6 < bytes.length) {
      out.peak_wind_gust = ((bytes[i + 1] << 8) | bytes[i + 2]) / 10;
      out.cumulative_rainfall = _be32(bytes, i + 3) / 1000;
      i += 7;
    } else if (pid === 0x03 && i + 1 < bytes.length) {
      out.battery = bytes[i + 1];
      i += 2;
    } else if (pid === 0x04 && i + 9 < bytes.length) {
      out.battery = bytes[i + 1];
      out.hardware_version = bytes[i + 2] + '.' + bytes[i + 3];
      out.software_version = bytes[i + 4] + '.' + bytes[i + 5];
      out.upload_interval = (bytes[i + 6] << 8) | bytes[i + 7];
      out.gps_uplink_interval = (bytes[i + 8] << 8) | bytes[i + 9];
      i += 10;
    } else if (pid === 0x05 && i + 4 < bytes.length) {
      out.upload_interval = (bytes[i + 1] << 8) | bytes[i + 2];
      out.gps_uplink_interval = (bytes[i + 3] << 8) | bytes[i + 4];
      i += 5;
    } else if (pid === 0x06 && i + 1 < bytes.length) {
      out.error_code = bytes[i + 1];
      i += 2;
    } else {
      break;
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
