// Source: Watteco VAQA'O LoRaWAN official support documentation
// Device page (VAQA'O family 50-70-168; VAQAO+Plus is 50-70-074): https://support.watteco.com/vaqao/
// Temperature cluster: https://support.watteco.com/temperature-measurement-cluster/
// Relative humidity cluster: https://support.watteco.com/relative-humidity-measurements-cluster/
// Concentration cluster (0x800C): https://support.watteco.com/concentration-measurements-cluster/
// Binary Input cluster: https://support.watteco.com/cluster-binary-input/
// Configuration cluster (node power descriptor): https://support.watteco.com/configuration/
// Endpoints: EP0 (Fctrl 0x11) temperature/humidity (±0.5°C, ±3%), VOC concentration
// (IAQ index), case opening; EP1 (Fctrl 0x31) temperature/humidity (±0.2°C, ±2%),
// CO2 concentration (ppm, NDIR).
// Applicative layer: ZCL binary, all frames on FPort 125, big endian.
// Standard uplink frame: [Fctrl][Cmd][Cluster(2B)][Attr(2B)][Type][Value]
// Fctrl bit0=1 standard ZCL frame, endpoint = (Fctrl >> 5) & 0x07.
// Cmd 0x0A report attributes, 0x8A alarm report (value followed by 2 report-cause bytes,
// e.g. manual sample 318A0405000021053398B0), 0x01 read attributes response.
// Batch frames (Fctrl bit0=0) use a vendor-compressed serie format and are not expanded.

var CLUSTER_TEMPERATURE = 0x0402;
var CLUSTER_HUMIDITY = 0x0405;
var CLUSTER_CONCENTRATION = 0x800C;
var CLUSTER_BINARY_INPUT = 0x000F;
var CLUSTER_CONFIGURATION = 0x0050;

var TYPE_SIZES = {
  0x08: 1, 0x10: 1, 0x18: 1, 0x20: 1, 0x28: 1, 0x30: 1,
  0x09: 2, 0x19: 2, 0x21: 2, 0x29: 2,
  0x0a: 3, 0x1a: 3, 0x22: 3,
  0x0b: 4, 0x23: 4, 0x2b: 4, 0x39: 4
};

function _toHex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16).toUpperCase();
  return s;
}

function _float32(b0, b1, b2, b3) {
  var sign = (b0 & 0x80) ? -1 : 1;
  var exp = ((b0 & 0x7f) << 1) | (b1 >> 7);
  var frac = ((b1 & 0x7f) << 16) | (b2 << 8) | b3;
  if (exp === 0 && frac === 0) return 0;
  if (exp === 255) return null;
  return sign * (1 + frac / 8388608) * Math.pow(2, exp - 127);
}

function _readTyped(bytes, type, off) {
  var size = TYPE_SIZES[type];
  if (size === undefined || off + size > bytes.length) return null;
  var v;
  if (type === 0x39) {
    v = _float32(bytes[off], bytes[off + 1], bytes[off + 2], bytes[off + 3]);
  } else {
    v = 0;
    for (var i = 0; i < size; i++) v = (v * 256) + bytes[off + i];
    if (type === 0x29 && v > 32767) v -= 65536;
    if (type === 0x2b && v > 2147483647) v -= 4294967296;
    if (type === 0x28 && v > 127) v -= 256;
  }
  return { v: v, next: off + size };
}

function _applyField(out, bytes, endpoint, cluster, attr, type, off) {
  // Returns next offset, or -1 on parse failure.
  if (type === 0x41 || type === 0x42) { // octet/char string: [len][content]
    if (off >= bytes.length) return -1;
    var len = bytes[off];
    if (off + 1 + len > bytes.length) return -1;
    if (cluster === CLUSTER_CONFIGURATION && attr === 0x0006) _decodePowerDescriptor(out, bytes, off + 1, len);
    return off + 1 + len;
  }
  if (type === 0x43 || type === 0x4c) { // long octet string / structure: [len 2B][content]
    if (off + 2 > bytes.length) return -1;
    var len2 = (bytes[off] << 8) | bytes[off + 1];
    if (off + 2 + len2 > bytes.length) return -1;
    return off + 2 + len2;
  }
  var r = _readTyped(bytes, type, off);
  if (!r) return -1;
  if (cluster === CLUSTER_TEMPERATURE && attr === 0x0000) {
    if (endpoint === 0) out.temperature = r.v / 100; // MeasuredValue unit 0.01 degC
    else if (endpoint === 1) out.temperature_2 = r.v / 100;
  } else if (cluster === CLUSTER_HUMIDITY && attr === 0x0000) {
    if (endpoint === 0) out.humidity = r.v / 100; // MeasuredValue unit 0.01 %RH
    else if (endpoint === 1) out.humidity_2 = r.v / 100;
  } else if (cluster === CLUSTER_CONCENTRATION && attr === 0x0000) {
    if (endpoint === 0) out.voc = r.v; // VOC IAQ index (0-500)
    else if (endpoint === 1) out.co2 = r.v; // CO2 in ppm
  } else if (cluster === CLUSTER_CONCENTRATION && attr === 0x0001) {
    if (endpoint === 0) out.voc_classification = r.v;
    else if (endpoint === 1) out.co2_classification = r.v;
  } else if (cluster === CLUSTER_BINARY_INPUT && attr === 0x0055) {
    if (endpoint === 0) out.tamper = (r.v === 1); // case opening detection
  }
  return r.next;
}

function _decodePowerDescriptor(out, bytes, off, len) {
  // Content: [power mode u8][power sources bitmask u8][voltage u16 mV per declared source]...
  if (len < 3 || off + 2 > bytes.length) return;
  var sources = bytes[off + 1];
  var count = 0;
  var tmp = sources;
  while (tmp) { count += (tmp & 1); tmp >>= 1; }
  if (count > 0 && off + 2 + 2 * count <= bytes.length) {
    out.battery_voltage = (((bytes[off + 2] << 8) | bytes[off + 3]) / 1000);
  }
}

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 4) return out;
  out.raw_uplink = _toHex(bytes);
  var fctrl = bytes[0];
  if ((fctrl & 0x01) !== 1) return out; // batch frame (vendor-compressed serie)
  var cmd = bytes[1];
  if (cmd !== 0x0a && cmd !== 0x8a && cmd !== 0x01) return out;
  var cluster = (bytes[2] << 8) | bytes[3];
  var endpoint = (fctrl >> 5) & 0x07;
  var off = 4;
  while (off < bytes.length) {
    if (cmd === 0x8a && bytes.length - off === 2) break; // trailing report cause (RP + criteria slot)
    if (off + 2 > bytes.length) break;
    var attr = (bytes[off] << 8) | bytes[off + 1];
    off += 2;
    if (cmd === 0x01) { // read response carries a status byte before the type
      if (off >= bytes.length) break;
      if (bytes[off] !== 0) { off += 1; continue; } // failed attribute, skip
      off += 1;
    }
    if (off >= bytes.length) break;
    var type = bytes[off];
    off += 1;
    var next = _applyField(out, bytes, endpoint, cluster, attr, type, off);
    if (next < 0) break;
    off = next;
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
