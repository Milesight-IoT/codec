// Source: ATIM ACW-PIR user guide (ATIM_ACW-PIR_UG_EN_V1.9 / FR V2.0, 2024-10-31)
// https://www.atim.com/wp-content/uploads/documentation/ACW/ACW-PIR/ENGLISH/ATIM_ACW-PIR_UG_EN.pdf
// Standard frame (9 bytes): 0x32 | type (0x01 case opening / 0x08 alarm / 0x10 counting)
//   | case-open sensor (0x00 closed / 0x01 open) | 0xFF unused | DQ sensor (0xFF unused on PIR)
//   | counter MSB | counter LSB | temperature sensor voltage MSB | LSB (mV, optional)
// Life frame (6 bytes): 0x01 | standby battery LSB | MSB | emission battery MSB | LSB | 0x64
// Battery voltages are in millivolts; byte order per the UG tables (standby LSB first,
// emission MSB first). Temperature estimate: T[C] = -66.875 + 218.75 * (Vt / Vdd),
// Vdd being the battery voltage from the life frames (kept across calls in module state).

var _pirVddMv = 0; // last known standby battery voltage in mV from a life frame

function _decode(bytes, fPort) {
  var out = { raw_uplink: '' };
  if (!bytes || !bytes.length) return out;
  for (var i = 0; i < bytes.length; i++) {
    out.raw_uplink += ('0' + bytes[i].toString(16).toUpperCase()).slice(-2);
  }
  if (bytes[0] === 0x32 && bytes.length >= 7) {
    var types = { 0x01: 'case_opening', 0x08: 'alarm', 0x10: 'counting' };
    if (types[bytes[1]]) out.frame_type = types[bytes[1]];
    out.case_open = bytes[2] === 0x01 ? 1 : 0;
    out.detection_count = (bytes[5] << 8) | bytes[6];
    if (bytes.length >= 9) {
      var vt = (bytes[7] << 8) | bytes[8]; // temperature sensor voltage in mV
      if (vt !== 0x0000 && vt !== 0xFFFF) { // 0/0xFFFF = optional sensor not wired
        out.temperature_sensor_mv = vt;
        if (_pirVddMv > 0) {
          out.temperature = Math.round((-66.875 + 218.75 * (vt / _pirVddMv)) * 100) / 100;
        }
      }
    }
  } else if (bytes[0] === 0x01 && bytes.length >= 5) {
    var standbyMv = bytes[1] | (bytes[2] << 8); // LSB first
    var emissionMv = (bytes[3] << 8) | bytes[4]; // MSB first
    out.battery_voltage_standby = standbyMv / 1000;
    out.battery_voltage_emission = emissionMv / 1000;
    _pirVddMv = standbyMv;
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input && input.bytes, input && input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
