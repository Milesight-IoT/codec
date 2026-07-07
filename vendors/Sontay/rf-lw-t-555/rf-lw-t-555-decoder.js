function _decode(bytes) {
  var SENSOR_TEMP = (1 << 1);
  var SENSOR_RH   = (1 << 2);
  var SENSOR_CO2  = (1 << 3);

  var sensors = (bytes[0] << 8) | (bytes[1] & 0xFE);
  var vBat    = ((bytes[1] & 0x01) << 8) | bytes[2];
  var out = {};
  out.battery_voltage = vBat / 100;
  if (vBat >= 330)       out.battery_status = 'Good';
  else if (vBat < 300)   out.battery_status = 'Poor';
  else                   out.battery_status = 'OK';

  var slot = 0;
  for (var i = 1; i < 16; i++) {
    var flag = sensors & (1 << i);
    if (flag === 0) continue;
    var d = (bytes[3 + 2 * slot] << 8) | bytes[4 + 2 * slot];
    if (d > 0x7FFF) d -= 0xFFFF;
    if (flag === SENSOR_TEMP)  out.temperature = d / 100;
    else if (flag === SENSOR_RH) out.humidity  = d / 10;
    else if (flag === SENSOR_CO2) out.co2      = d;
    if (++slot >= 4) break;
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes) }; }
function Decode(fPort, bytes) { return _decode(bytes); }
function Decoder(bytes, port) { return _decode(bytes); }
