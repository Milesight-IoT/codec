// Source: Decentlab DL-IAM Datasheet (Indoor Ambiance Monitor including
// CO2, tVOC and motion sensor for LoRaWAN), "Sensor data message format" /
// "Details" / "Example 1-3" sections,
// https://cdn.decentlab.com/download/datasheets/Decentlab-DL-IAM-datasheet.pdf
// Cleanroom implementation: frame layout, conversions and the illuminance
// formula derived solely from the vendor datasheet PDF.
//
// Frame: version(1B, =2) + device_id(2B) + flags(2B), big endian, then one
// uint16 block per flag bit set (bit n == 1 -> sensor n data included).
// Sensor 0: battery voltage = x / 1000 [V]
// Sensor 1: air temperature = 175 * x / 65535 - 45 [degC];
//           air humidity = 100 * x / 65535 [%]
// Sensor 2: barometric pressure = 2 * x [Pa]
// Sensor 3: ambient light CH0 / CH1 = x
// Sensor 4: CO2 concentration = x - 32768 [ppm]; CO2 sensor status = x;
//           raw IR reading = x
// Sensor 5: PIR activity counter = x
// Sensor 6: total VOC = x [ppb]
// Illuminance [lx] = max((1.00*CH0 - 1.64*CH1), (0.59*CH0 - 0.86*CH1)) * 1.5504

function _hex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16)).slice(-2);
  return s.toUpperCase();
}

function _u16(b, o) { return (b[o] << 8) | b[o + 1]; }

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 5) return out;
  out.raw_uplink = _hex(bytes);
  out.protocol_version = bytes[0];
  out.device_id = _u16(bytes, 1);
  var flags = _u16(bytes, 3);
  var o = 5;
  if ((flags & 1) && o + 2 <= bytes.length) {
    out.battery_voltage = _u16(bytes, o) / 1000;
    o += 2;
  }
  if ((flags & 2) && o + 4 <= bytes.length) {
    out.air_temperature = 175 * _u16(bytes, o) / 65535 - 45;
    out.air_humidity = 100 * _u16(bytes, o + 2) / 65535;
    o += 4;
  }
  if ((flags & 4) && o + 2 <= bytes.length) {
    out.barometric_pressure = 2 * _u16(bytes, o);
    o += 2;
  }
  if ((flags & 8) && o + 4 <= bytes.length) {
    out.ambient_light_ch0 = _u16(bytes, o);
    out.ambient_light_ch1 = _u16(bytes, o + 2);
    o += 4;
  }
  if ((flags & 16) && o + 6 <= bytes.length) {
    out.co2_concentration = _u16(bytes, o) - 32768;
    out.co2_sensor_status = _u16(bytes, o + 2);
    out.raw_ir_reading = _u16(bytes, o + 4);
    o += 6;
  }
  if ((flags & 32) && o + 2 <= bytes.length) {
    out.pir_activity_counter = _u16(bytes, o);
    o += 2;
  }
  if ((flags & 64) && o + 2 <= bytes.length) {
    out.total_voc = _u16(bytes, o);
    o += 2;
  }
  if (out.ambient_light_ch0 !== undefined && out.ambient_light_ch1 !== undefined) {
    var l1 = (1.00 * out.ambient_light_ch0 - 1.64 * out.ambient_light_ch1) * 1.5504;
    var l2 = (0.59 * out.ambient_light_ch0 - 0.86 * out.ambient_light_ch1) * 1.5504;
    out.illuminance = Math.max(l1, l2);
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
