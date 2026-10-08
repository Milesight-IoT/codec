// Source: Netvox R831D Wireless 3-Gang Relay/Dry Contact User Manual (netvox.com.tw/um/R831D/R831DUsermanual.pdf)
// Uplink FPort 0x06: Version(0x01) + DeviceType(0xB0) + ReportType + 8-byte NetvoxPayLoadData (big endian)
// FPort 0x07: configure / switch type responses; FPort 0x0F: dry contact trigger time responses

function _hex(bytes) {
  var out = '';
  for (var i = 0; i < bytes.length; i++) out += ('0' + bytes[i].toString(16)).slice(-2);
  return out.toUpperCase();
}

function _u16(b, o) {
  return (b[o] << 8) | b[o + 1];
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
    // Data packet: Relay1Status(1B) + Relay2Status(1B) + Relay3Status(1B)
    //              + Input1(1B) + Input2(1B) + Input3(1B) + Reserved(2B)
    out.relay1_status = p[0];
    out.relay2_status = p[1];
    out.relay3_status = p[2];
    out.input1 = p[3];
    out.input2 = p[4];
    out.input3 = p[5];
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
  } else if (cmd === 0x83) {
    out.cmd = 'set_switch_type_rsp';
    out.status = p[0];
  } else if (cmd === 0x84) {
    out.cmd = 'get_switch_type_rsp';
    out.switch_type = p[0] === 0 ? 'toggle' : p[0] === 1 ? 'momentary' : p[0];
  }
  return out;
}

function _decode0F(bytes) {
  // FPort 0x0F frames carry no DeviceType byte: CmdID + payload (manual example 820064)
  var out = {};
  var cmd = bytes[0];
  if (cmd === 0x81) {
    out.cmd = 'set_dry_contact_trigger_time_rsp';
    out.status = bytes[1];
  } else if (cmd === 0x82) {
    out.cmd = 'get_dry_contact_trigger_time_rsp';
    out.min_trigger_time = _u16(bytes, 1);
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
  else if (fPort === 15) d = _decode0F(bytes);
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
