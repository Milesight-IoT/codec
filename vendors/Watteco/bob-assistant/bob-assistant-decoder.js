// Source: NKE Watteco official support documentation
// https://support.watteco.com/bobv2/ (BoB Assistant V2 - Applicative layer, Report frame example)
// The BoB Assistant does not implement the ZCL library. Uplinks arrive on port 1.
// Frame type is defined by the first byte (header):
//   0x53 STATE, 0x6C LEARNING, 0x72 REPORT, 0x61 ALARM.
// Only the REPORT frame (0x72, 27 bytes) structure is published on the support page; it is fully decoded
// below. STATE/LEARNING/ALARM frame layouts are only described in the BoB reference manual, so only the
// frame type is reported for those headers.
// REPORT frame fields (per the documented worked example):
//   drift %, operating time (min), time per drift range (min), alarm number, temperature (degC),
//   report period (min), report id, vibration level (g), peak frequency (Hz), battery (%),
//   and 9 anomaly-forecast bytes (3 groups: 24h / 30d / 6 months, each: time to 20%/50%/80% drift, in hours,
//   0xFF = infinite).

function _hex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
  return s.toUpperCase();
}

function _round(x, d) {
  var f = Math.pow(10, d);
  return Math.round(x * f) / f;
}

function _forecast(bytes, pos) {
  // one forecast byte in hours, 0xFF = infinite -> null
  return bytes[pos] === 0xff ? null : bytes[pos];
}

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || !bytes.length) return out;
  out.raw_uplink = _hex(bytes);
  var header = bytes[0];
  if (header === 0x53) { out.frame_type = 1; return out; }   // STATE
  if (header === 0x6c) { out.frame_type = 2; return out; }   // LEARNING
  if (header === 0x61) { out.frame_type = 3; return out; }   // ALARM
  if (header !== 0x72) return out;                            // unknown header
  out.frame_type = 0;                                         // REPORT
  if (bytes.length < 27) return out;

  var period = bytes[6] < 59 ? bytes[6] : (bytes[6] - 59) * 60; // report period, minutes
  out.report_period_min = period;
  out.drift_percentage = bytes[1];
  out.operating_time_min = _round(bytes[2] * period / 127, 1);
  var base = out.operating_time_min;
  out.time_0_10_min = _round(bytes[3] * period / 127, 1);
  var span = period - out.time_0_10_min;
  out.alarm_number = bytes[4];
  out.temperature = _round(bytes[5] - 30, 1);
  out.report_id = bytes[7];
  // vibration level: vl = (vl1*128 + vl2 + vl3/100) / 10 / 121.45 (g)
  out.vibration_level_g = _round((bytes[8] * 128 + bytes[9] + bytes[10] / 100) / 10 / 121.45, 4);
  // peak frequency: idx = value + 1; idx < 128 -> idx*800/256 else (idx-128)*25600/256 (Hz)
  var idx = bytes[11] + 1;
  out.peak_frequency_hz = _round(idx < 128 ? idx * 800 / 256 : (idx - 128) * 25600 / 256, 3);
  out.time_10_20_min = _round(span * bytes[12] / 127, 1);
  out.time_20_40_min = _round(span * bytes[13] / 127, 1);
  out.time_40_60_min = _round(span * bytes[14] / 127, 1);
  out.time_60_80_min = _round(span * bytes[15] / 127, 1);
  out.time_80_100_min = _round(span * bytes[16] / 127, 1);
  out.battery_level_percent = _round(bytes[17] * 100 / 127, 1);
  out.forecast_20pct_24h_h = _forecast(bytes, 18);
  out.forecast_50pct_24h_h = _forecast(bytes, 19);
  out.forecast_80pct_24h_h = _forecast(bytes, 20);
  out.forecast_20pct_30d_h = _forecast(bytes, 21);
  out.forecast_50pct_30d_h = _forecast(bytes, 22);
  out.forecast_80pct_30d_h = _forecast(bytes, 23);
  out.forecast_20pct_6m_h = _forecast(bytes, 24);
  out.forecast_50pct_6m_h = _forecast(bytes, 25);
  out.forecast_80pct_6m_h = _forecast(bytes, 26);
  return out;
}

function decodeUplink(input) { return { data: _decode(input && input.bytes, input && input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
