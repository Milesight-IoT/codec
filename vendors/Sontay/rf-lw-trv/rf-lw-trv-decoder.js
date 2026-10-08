// Source: Sontay RF-LW-TRV LoRaWAN TRV Smart Radiator Thermostat
// OEM hardware: MClimate Vicki LoRaWAN (model MC-LW-V02), payload per
// https://docs.mclimate.eu/mclimate-lorawan-devices/devices/mclimate-vicki-lorawan/vicki-lorawan-device-communication-protocol/
// Uplinks use fPort 2. The 9-byte keep-alive (command 0x01 for fw <= 3.4,
// 0x81 for fw >= 3.5) may be preceded by other command responses, e.g.
// 0x52 target temperature (0.1 degC resolution), 0x28 manual target change,
// or a chain of network/settings GET responses: 0x12 keep-alive period [min],
// 0x14 child lock, 0x15 target temp range lower/upper [degC], 0x18 online
// operational mode, 0x19 join retry period (T[s] = XX*5), 0x1B uplink type,
// 0x1D watchdog (WDP confirmed [uplinks], WDP unconfirmed [h]).

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || !bytes.length) return out;
  var hex = '';
  for (var i = 0; i < bytes.length; i++) hex += ('0' + bytes[i].toString(16).toUpperCase()).slice(-2);
  out.raw_uplink = hex;
  if (fPort !== undefined && fPort !== 2) return out;

  // keep-alive is the trailing command: anchor it at the end of the payload
  var ka = -1;
  if (bytes.length >= 9) {
    var tail = bytes.length - 9;
    if (bytes[tail] === 0x01 || bytes[tail] === 0x81) ka = tail;
  }
  if (ka < 0 && bytes.length === 9 && (bytes[0] === 0x01 || bytes[0] === 0x81)) ka = 0;

  if (ka >= 0) {
    out.target_temperature = bytes[ka + 1];
    var t;
    if (bytes[ka] === 0x81) t = (bytes[ka + 2] - 28.33333) / 5.66666;
    else t = (bytes[ka + 2] * 165) / 256 - 40;
    out.temperature = Math.round(t * 100) / 100;
    out.humidity = Math.round(((bytes[ka + 3] * 100) / 256) * 100) / 100;
    out.motor_position = bytes[ka + 4] | ((bytes[ka + 6] >> 4) << 8);
    out.motor_range = bytes[ka + 5] | ((bytes[ka + 6] & 0x0f) << 8);
    if (out.motor_range > 0) out.valve_openness = Math.round((out.motor_position / out.motor_range) * 1000) / 10;
    out.battery_voltage = Math.round((2 + (bytes[ka + 7] >> 4) * 0.1) * 100) / 100;
    out.open_window = (bytes[ka + 7] >> 3) & 1;
    out.child_lock = (bytes[ka + 8] >> 7) & 1;
    out.antifreeze_active = (bytes[ka + 8] >> 3) & 1;
    out.low_battery = (bytes[ka + 8] >> 1) & 1;
    out.online = (bytes[ka + 8] >> 4) & 1;
  }

  // leading commands carry the fresher / higher-resolution setpoint: let them win;
  // network/settings GET responses are chained before the keep-alive, each with
  // its documented length, so walk them one by one
  var end = ka >= 0 ? ka : bytes.length;
  var j = 0;
  while (j < end) {
    if (bytes[j] === 0x52 && j + 3 <= end) {
      out.target_temperature = (((bytes[j + 1] << 8) | bytes[j + 2]) / 10);
      j += 3;
    } else if (bytes[j] === 0x28 && j + 2 <= end) {
      out.target_temperature = bytes[j + 1];
      j += 2;
    } else if (bytes[j] === 0x12 && j + 2 <= end) {
      out.keepalive_period = bytes[j + 1];
      j += 2;
    } else if (bytes[j] === 0x14 && j + 2 <= end) {
      out.child_lock = bytes[j + 1] ? 1 : 0;
      j += 2;
    } else if (bytes[j] === 0x15 && j + 3 <= end) {
      out.target_temperature_min = bytes[j + 1];
      out.target_temperature_max = bytes[j + 2];
      j += 3;
    } else if (bytes[j] === 0x18 && j + 2 <= end) {
      out.operational_mode = bytes[j + 1];
      j += 2;
    } else if (bytes[j] === 0x19 && j + 2 <= end) {
      out.join_retry_period = bytes[j + 1] * 5;
      j += 2;
    } else if (bytes[j] === 0x1B && j + 2 <= end) {
      out.uplink_confirmed = bytes[j + 1] ? 1 : 0;
      j += 2;
    } else if (bytes[j] === 0x1D && j + 3 <= end) {
      out.watchdog_confirmed = bytes[j + 1];
      out.watchdog_unconfirmed = bytes[j + 2];
      j += 3;
    } else {
      break;
    }
  }

  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
