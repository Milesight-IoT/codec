// Source: Browan "Temperature & Humidity Sensor" Reference Manual, models TBHH100-915 / TBHH100-868,
//         (c) 2019 Browan Communications Inc., section 4.1.2 Payload (uplink status frame).
//         Appendix "Configuration Downlink Command" (port 204) is handled via raw_downlink passthrough.
// Manual archived at: eg71-codec/manuals/Browan/TBHH100-RM_Temperature_Humidity_Sensor.pdf
//
// Uplink status frame (RM 4.1.2): port 107, payload length 8 bytes.
//   byte0: status, 0x00 = VOC sensor frame, 0x08 = temperature and humidity sensor frame
//   byte1: battery, bits[3:0] = voltage code v (unsigned, range 1-14), voltage V = (25 + v) / 10; bits[7:4] RFU
//   byte2: temperature, bits[6:0] = T (unsigned, 0-127), degC = T - 32 (measurement range -32 to 95 degC); bit[7] RFU
//   byte3: relative humidity, bits[6:0] = %RH (unsigned, 0-100), 127 indicates measurement error; bit[7] RFU
//   byte4-5: CO2, bits[15:0] RFU, always 0xffff (no CO2 sensor installed in this module)
//   byte6-7: VOC, bits[15:0] RFU, always 0xffff (no VOC sensor installed in this module)

function _toHex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) {
    s += ('0' + bytes[i].toString(16)).slice(-2).toUpperCase();
  }
  return s;
}

function _decode(bytes) {
  var out = {};
  if (!bytes || bytes.length === 0) return out;

  out.raw_uplink = _toHex(bytes);

  // RM 4.1.2: status frame payload length is 8 bytes; other lengths are not defined
  if (bytes.length !== 8) return out;

  // byte0: frame source identification
  if (bytes[0] === 0x08) {
    out.status = 'Temperature and humidity sensor';
  } else if (bytes[0] === 0x00) {
    out.status = 'VOC sensor';
  } else {
    out.status = 'Unknown (0x' + ('0' + bytes[0].toString(16)).slice(-2).toUpperCase() + ')';
  }

  // byte1: battery voltage, V = (25 + bits[3:0]) / 10
  out.battery_voltage = Math.round((25 + (bytes[1] & 0x0f)) * 10) / 100;

  // byte2: temperature in degC, (bits[6:0]) - 32
  out.temperature = (bytes[2] & 0x7f) - 32;

  // byte3: relative humidity in %, 127 = measurement error
  var rh = bytes[3] & 0x7f;
  if (rh === 127) {
    out.humidity_error = true;
    out.humidity = null;
  } else {
    out.humidity_error = false;
    out.humidity = rh;
  }

  // byte4-7: CO2 and VOC are RFU on TBHH100 (always 0xffff), not decoded

  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes) }; }
function Decode(fPort, bytes) { return _decode(bytes); }
function Decoder(bytes, port) { return _decode(bytes); }
