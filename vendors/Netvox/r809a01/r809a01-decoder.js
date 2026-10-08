// Source: Netvox R809A01 Wireless Plug-and-Play Power Outlet with Consumption Monitoring User Manual
// (netvox.com.tw/um/R809A01/R809A01Usermanual.pdf)
// Uplink FPort 0x06: Version(0x01) + DeviceType(0x0E) + ReportType + 8-byte NetvoxPayLoadData (big endian)
// Data layouts: ReportType 0x01 (OnOff + Energy + alarms), ReportType 0x02 (Voltage + Current + Power)
// FPort 0x07: configure command responses (CmdID dispatch)

function _hex(bytes) {
  var out = '';
  for (var i = 0; i < bytes.length; i++) out += ('0' + bytes[i].toString(16)).slice(-2);
  return out.toUpperCase();
}

function _u16(b, o) {
  return (b[o] << 8) | b[o + 1];
}

function _u32(b, o) {
  return (((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0);
}

function _version(byte) {
  return 'V' + (byte / 10).toFixed(1);
}

function _decode06(bytes) {
  var out = {};
  var rt = bytes[2];
  var p = bytes.slice(3);
  if (rt === 0x00) {
    // Version packet: SoftwareVersion(1B) + HardwareVersion(1B) + DateCode(4B, BCD) + Reserved(2B)
    out.software_version = _version(p[0]);
    out.hardware_version = _version(p[1]);
    var d = '';
    for (var i = 0; i < 4; i++) d += ('0' + ((p[2 + i] >> 4) * 10 + (p[2 + i] & 0x0F))).slice(-2);
    out.date_code = d.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
  } else if (rt === 0x01) {
    // Data packet: OnOff(1B) + Energy(4B, 1Wh) + OverCurrentAlarm(1B)
    //              + DashCurrentAlarm(1B, CLAA only) + PowerOffAlarm(1B)
    out.on_off_status = p[0];
    out.energy = _u32(p, 1);
    out.over_current_alarm = p[5];
    out.dash_current_alarm = p[6];
    out.power_off_alarm = p[7];
  } else if (rt === 0x02) {
    // Data packet: Vol(2B, 1V) + Current(2B, 1mA) + Power(2B, 1W active) + Reserved(2B)
    out.voltage = _u16(p, 0);
    out.current = _u16(p, 2);
    out.power = _u16(p, 4);
  }
  return out;
}

function _decode07(bytes) {
  var out = {};
  var cmd = bytes[0];
  var p = bytes.slice(2);
  if (cmd === 0x81) {
    out.cmd = 'config_report_rsp';
    out.status = p[0];
  } else if (cmd === 0x82) {
    out.cmd = 'read_config_report_rsp';
    out.min_time = _u16(p, 0);
    out.max_time = _u16(p, 2);
    out.current_change = _u16(p, 4);
    out.power_change = _u16(p, 6);
  }
  return out;
}

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 3) return out;
  out.raw_uplink = _hex(bytes);
  var d = null;
  if (fPort === 6) d = _decode06(bytes);
  else if (fPort === 7) d = _decode07(bytes);
  if (d) {
    for (var k in d) out[k] = d[k];
  }
  return out;
}

function decodeUplink(input) {
  return { data: _decode(input.bytes, input.fPort) };
}
function Decode(fPort, bytes) {
  return _decode(bytes, fPort);
}
function Decoder(bytes, port) {
  return _decode(bytes, port);
}
