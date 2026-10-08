// Source: Sontay RF-LW-MODB LoRaWAN Modbus Bridge (OEM of Synetica enLink Modbus, firmware FW-MB-32, product ENL-MOD-32)
// Sontay datasheet / user guide: https://www.sontay.com/en-gb/products/smart-devices/lorawan/rf-lw-modb-lorawan-modbus-bridge/
// Synetica enLink uplink payload spec (TLV, fPort 1): each of the 32 configured Modbus items reports as
// 0x0F exception U8 (Modbus exception code), 0x10 interval F32 (instantaneous register value) or
// 0x11 cumulative F32 (accumulating register value), prefixed by the item index 0-31.
// KPI 0x42 battery voltage U16 mV. Battery 3600 mV denotes external power.
function _hex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16)).slice(-2);
  return s.toUpperCase();
}

function _f32(b, i) {
  var v = new DataView(new ArrayBuffer(4));
  v.setUint8(0, b[i]); v.setUint8(1, b[i + 1]); v.setUint8(2, b[i + 2]); v.setUint8(3, b[i + 3]);
  return v.getFloat32(0);
}

function _u16(b, i) {
  return (b[i] << 8) | b[i + 1];
}

function _r2(v) {
  return Math.round(v * 100) / 100;
}

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 2) return out;
  var i = 0;
  while (i < bytes.length) {
    var t = bytes[i];
    if (t === 0x10 && i + 6 <= bytes.length) {
      out['modbus_' + (bytes[i + 1] + 1) + '_interval'] = _r2(_f32(bytes, i + 2));
      i += 6;
    } else if (t === 0x11 && i + 6 <= bytes.length) {
      out['modbus_' + (bytes[i + 1] + 1) + '_cumulative'] = _r2(_f32(bytes, i + 2));
      i += 6;
    } else if (t === 0x0F && i + 3 <= bytes.length) {
      out['modbus_' + (bytes[i + 1] + 1) + '_exception'] = bytes[i + 2];
      i += 3;
    } else if (t === 0x42 && i + 3 <= bytes.length) {
      out.battery_voltage = _u16(bytes, i + 1);
      i += 3;
    } else {
      break;
    }
  }
  out.raw_uplink = _hex(bytes);
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
