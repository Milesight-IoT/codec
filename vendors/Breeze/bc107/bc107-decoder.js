// BC107 / MC6-162 fan-coil thermostat LoRaWAN uplink decoder
// Source: vendor protocol doc "MC6-162-LoRawan protocal-26byes-20260917.pdf"
// (26-byte basic frame; two-valve byte layout confirmed by this revision — the
// 20260513 revision carried a stale example payload, since corrected by the vendor).
// Covers BC107-4M / 4EM / 4AM / 4AEM, which share the same payload.
//
// Basic frame, 26 bytes, big-endian:
//   [0..1]   room temperature, 0.1 degC/LSB
//   [2..3]   room humidity, 1 %RH/LSB
//   [4..5]   setpoint, 0.1 degC/LSB
//   [6]      system mode: 0=Heat 1=Cool 2=Vent 3=Dehumidify 4=Auto 5=Off
//            (uplink table; downlink wire codes differ, see encoder)
//   [7]      switching differential, 0.1 degC/LSB (raw 5/10/15/20 = 0.5/1.0/1.5/2.0 degC)
//   [8]      away: 0=Home 1=Away
//   [9]      lock out status: 0=disabled 1=enabled
//   [10..13] lock pin, one decimal digit (0-9) per byte, e.g. 01 02 03 04 -> "1234"
//   [14]     temperature reading format: 0=Celsius 1=Fahrenheit
//   [15]     fan setting: 0=High 1=Med 2=Low 3=Auto
//   [16]     timezone index: 0..12 = UTC+0..UTC+12, 13..24 = UTC-12..UTC-1,
//            value > 24 = timezone disabled
//   [17..18] firmware version, raw number (e.g. 0x006C = 108)
//   [19]     valve status, cool valve (4-pipe) / single valve (2-pipe):
//            on/off models: 0=off 1=2-pipe valve on 2=4-pipe heat valve on
//            3=4-pipe cool valve on; modulating (0-10V) models: 0-100 = 0-100% output
//   [20]     valve status, heat valve (4-pipe) / heat output (E-heat, HW):
//            same coding as byte 19
//   [21]     fan status: on/off fan 0=off 1=Low 2=Med 3=High;
//            EC fan 0-100 = 0-100% output; heating-only models: 1 = heat relay
//            ON, 0 = heat relay OFF
//   [22]     schedule mode: 0=Weekday/Weekend 1=7 Days 2=24 Hrs 3=None
//   [23..24] CO2, 1 ppm/LSB
//   [25]     on/off status: 0=Off 1=On
//
// Schedule uplink frames are sent as separate batches (~50 s apart) but their
// format is not documented; any frame whose length is not 26 decodes to an empty
// object until the vendor publishes the schedule frame definition. After a
// successful downlink the device re-uplinks the basic frame (~10 s, no schedule).

function decodeUplink(input) {
  var bytes = input ? input.bytes : null;
  var data = {};
  if (!bytes || bytes.length !== 26) {
    return { data: data };
  }

  data.room_temperature = ((bytes[0] << 8) | bytes[1]) / 10;
  data.room_humidity = (bytes[2] << 8) | bytes[3];
  data.setpoint = ((bytes[4] << 8) | bytes[5]) / 10;
  data.system_mode = bytes[6];
  data.switching_diff = bytes[7] / 10;
  data.away = bytes[8];
  data.lock_out_status = bytes[9];
  data.lock_pin_number = "" + bytes[10] + bytes[11] + bytes[12] + bytes[13];
  data.temperature_reading_format = bytes[14];
  data.fan = bytes[15];
  data.timezone = bytes[16];
  data.firmware = (bytes[17] << 8) | bytes[18];
  data.valve_status_cool = bytes[19];
  data.valve_status_heat = bytes[20];
  data.fan_status = bytes[21];
  data.schedule_mode = bytes[22];
  data.co2 = (bytes[23] << 8) | bytes[24];
  data.on_off_status = bytes[25];

  return { data: data };
}

// ChirpStack v3 / Milesight gateway codec
function Decode(fPort, bytes) {
  return decodeUplink({ bytes: bytes, fPort: fPort }).data;
}

// ChirpStack v3 (alternate signature) / TTN
function Decoder(bytes, fPort) {
  return decodeUplink({ bytes: bytes, fPort: fPort }).data;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { decodeUplink: decodeUplink, Decode: Decode, Decoder: Decoder };
}
