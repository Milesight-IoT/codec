// Source: Netvox R718UBB User Manual (R718UBB-usermanual.pdf), section 5.1.
// FPort 0x06 uplink: Version(1) + DeviceType(1) + ReportType(1) + NetvoxPayLoadData(8), big-endian.
// FPort 0x07 uplink: CmdID(1) + DeviceType(1) + NetvoxPayLoadData(var). Set-type responses
// (0x81/0x83/0x87/0x9F) carry Status (0x00 success / 0x01 fail) in payload byte 0.
// Battery byte: bit0-6 = voltage * 0.1V, bit7 = 1 means low voltage.
// RT 0x01: Battery + Temperature(2B signed, 0.01C) + Humidity(2B, 0.01%) + CO2(2B, ppm) + ShockEvent.
// RT 0x02: Battery + AirPressure(4B, 0.01hPa) + Illuminance(3B, 1Lux).
// Unsupported sensor items read 0xFF/0xFFFF/0xFFFFFF/0xFFFFFFFF and are skipped.

function _hex(bytes) {
  var out = '';
  for (var i = 0; i < bytes.length; i++) out += ('0' + bytes[i].toString(16)).slice(-2);
  return out.toUpperCase();
}

function _round(v, n) {
  var m = Math.pow(10, n);
  return Math.round(v * m) / m;
}

function _i16(hi, lo) {
  var v = (hi << 8) | (lo & 0xff);
  return v > 0x7fff ? v - 0x10000 : v;
}

function _u16(hi, lo) {
  return ((hi << 8) | (lo & 0xff)) >>> 0;
}

function _u24(a, b, c) {
  return ((a << 16) | (b << 8) | c) >>> 0;
}

function _u32(a, b, c, d) {
  return (((a << 24) | (b << 16) | (c << 8) | d) >>> 0);
}

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 4) return out;
  out.raw_uplink = _hex(bytes);
  if (fPort === 0x06) {
    var p = bytes.slice(3);
    switch (bytes[2]) {
      case 0x00: // version packet
        if (p.length >= 6) {
          var d2 = function (b) { return '' + (b >> 4) + (b & 0x0f); };
          var s = d2(p[2]) + d2(p[3]) + d2(p[4]) + d2(p[5]);
          out.firmware_version = s.slice(0, 4) + '.' + s.slice(4, 6) + '.' + s.slice(6, 8);
        }
        break;
      case 0x01: // battery + temperature + humidity + CO2 + shock event
        if (p.length >= 8) {
          out.battery_voltage = _round((p[0] & 0x7f) * 0.1, 1);
          out.battery_low = (p[0] >> 7) & 1;
          var temp = _i16(p[1], p[2]);
          var hum = _u16(p[3], p[4]);
          var co2 = _u16(p[5], p[6]);
          if (temp !== -1) out.temperature = _round(temp * 0.01, 2);
          if (hum !== 0xffff) out.humidity = _round(hum * 0.01, 2);
          if (co2 !== 0xffff) out.co2 = co2;
          if (p[7] !== 0xff) out.shock_event = p[7] & 1;
        }
        break;
      case 0x02: // battery + air pressure + illuminance
        if (p.length >= 8) {
          out.battery_voltage = _round((p[0] & 0x7f) * 0.1, 1);
          out.battery_low = (p[0] >> 7) & 1;
          var press = _u32(p[1], p[2], p[3], p[4]);
          var lux = _u24(p[5], p[6], p[7]);
          if (press !== 0xffffffff) out.air_pressure = _round(press * 0.01, 2);
          if (lux !== 0xffffff) out.illuminance = lux;
        }
        break;
    }
  } else if (fPort === 0x07) {
    var cmd = bytes[0];
    if ((cmd === 0x81 || cmd === 0x83 || cmd === 0x87 || cmd === 0x9F) && bytes.length >= 3) {
      out.config_status = bytes[2]; // 0x00 success / 0x01 fail
    }
  }
  return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
