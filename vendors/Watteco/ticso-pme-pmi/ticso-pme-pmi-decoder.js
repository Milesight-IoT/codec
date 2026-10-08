// NKE Watteco TICS'O - PME-PMI meter reader (NKE Watteco TICS'O, cluster 0x57) uplink decoder.
// Source: TIC Sensors Application Layer Description v1.2 (chapters 3-5, 7), NKE Watteco,
// https://support.watteco.com/wp-content/uploads/2020/04/TIC_Application_Layer_Description_1.2.pdf
// and TICS'O User Guide 1.5.1: https://support.watteco.com/wp-content/uploads/2021/01/50-70-045_TIC_PMEPMI_User_Guide_1.5.1.pdf
// Cleanroom implementation: frame layout, TIC field profiles, descriptors and data types
// derived solely from the vendor PDF. All frames are sent on LoRaWAN port 125.
//
// Frame: <0x11 endpoint 0><cmd 0x0A report | 0x8A alarm-report | 0x01 read-response>
//        <cluster id BE><attribute id BE><type 0x41><size><descriptor><fields...>
// Attribute ids: 0x0i00 = instance i of the TIC data attribute (0x0001/0x0002 on ICE =
// period p / p-1 attributes); descriptor selects present fields by profile bit index
// (fixed 8-byte bitfield, or compact header: b7 obsolete, b6 shifted report,
// b5 0=variable bitfield / 1=variable indexes, b4..b0 total descriptor size).

function _hex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16)).slice(-2);
  return s.toUpperCase();
}
function _u8(b, o) { return b[o]; }
function _i8(b, o) { return (b[o] << 24 >> 24); }
function _u16(b, o) { return (b[o] << 8) | b[o + 1]; }
function _i16(b, o) { var v = _u16(b, o); return v >= 0x8000 ? v - 0x10000 : v; }
function _u24(b, o) { return (b[o] << 16) | (b[o + 1] << 8) | b[o + 2]; }
function _i24(b, o) { var v = _u24(b, o); return v >= 0x800000 ? v - 0x1000000 : v; }
function _u32(b, o) { return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0; }
function _i32(b, o) { return (b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]; }
function _f32(b, o) {
  var sign = b[o] & 0x80 ? -1 : 1;
  var exp = ((b[o] & 0x7f) << 1) | (b[o + 1] >> 7);
  var man = ((b[o + 1] & 0x7f) << 16) | (b[o + 2] << 8) | b[o + 3];
  if (exp === 0 && man === 0) return 0.0;
  if (exp === 255) return man ? NaN : sign * Infinity;
  return sign * Math.pow(2, exp - 127) * (1 + man / 0x800000);
}
function _bcd(v) { return ((v >> 4) * 10) + (v & 0x0f); }
function _pad(n) { return n < 10 ? '0' + n : '' + n; }

var CLUSTER_ID = 0x57;
// per-attribute TIC field profiles (index = descriptor bit number), from ALD 1.2 chapter 4
var PROFILES = {
    0: [
    { id: "test_mode", t: "EDI" },
    { id: "meter_id", t: "HEX" },
    { id: "tariff_processing_1", t: "ECO" },
    { id: "datetime", t: "DMY" },
    { id: "active_energy_withdrawn_primary", t: "U24" },
    { id: "reactive_pos_energy_primary", t: "U24" },
    { id: "reactive_neg_energy_primary", t: "U24" },
    { id: "apparent_energy_withdrawn_primary", t: "U24" },
    { id: "active_energy_injected_primary", t: "U24" },
    { id: "reactive_pos_energy_injected_primary", t: "U24" },
    { id: "reactive_neg_energy_injected_primary", t: "U24" },
    { id: "apparent_energy_injected_primary", t: "U24" },
    { id: "current_tarif_period_1", t: "EPT" },
    { id: "external_tarif_signal", t: "EDI" },
    { id: "dynamic_tarif_period_1", t: "EPT" },
    { id: "notice_tarif_period_1", t: "EPT" },
    { id: "dynamic_period_1_start", t: "TSE" },
    { id: "dynamic_period_1_end", t: "TSE" },
    { id: "next_dynamic_period_1_start", t: "TSE" },
    { id: "next_dynamic_period_1_end", t: "TSE" },
    { id: "mode", t: "EDI" },
    { id: "config", t: "EDI" },
    { id: "mean_power_1_date", t: "DMY" },
    { id: "mean_power_withdrawn_1", t: "U16" },
    { id: "mean_power_injected_1", t: "U16" },
    { id: "mean_power_2_date", t: "TS" },
    { id: "mean_power_withdrawn_2", t: "U16" },
    { id: "mean_power_injected_2", t: "U16" },
    { id: "mean_power_3_date", t: "TS" },
    { id: "mean_power_withdrawn_3", t: "U16" },
    { id: "mean_power_injected_3", t: "U16" },
    { id: "mean_power_4_date", t: "TS" },
    { id: "mean_power_withdrawn_4", t: "U16" },
    { id: "mean_power_injected_4", t: "U16" },
    { id: "mean_power_5_date", t: "TS" },
    { id: "mean_power_withdrawn_5", t: "U16" },
    { id: "mean_power_injected_5", t: "U16" },
    { id: "mean_power_6_date", t: "TS" },
    { id: "mean_power_withdrawn_6", t: "U16" },
    { id: "mean_power_injected_6", t: "U16" },
    { id: "contract_period_start", t: "TS" },
    { id: "active_energy_withdrawn_period", t: "U24" },
    { id: "active_energy_injected_period", t: "U24" },
    { id: "reactive_pos_energy_withdrawn_period", t: "U24" },
    { id: "reactive_neg_energy_withdrawn_period", t: "U24" },
    { id: "reactive_pos_energy_injected_period", t: "U24" },
    { id: "reactive_neg_energy_injected_period", t: "U24" },
    { id: "prev_contract_period_start", t: "TS" },
    { id: "prev_contract_period_end", t: "TS" },
    { id: "prev_active_energy_withdrawn", t: "U24" },
    { id: "prev_active_energy_injected", t: "U24" },
    { id: "prev_reactive_pos_energy", t: "U24" },
    { id: "prev_reactive_neg_energy", t: "U24" },
    { id: "subscribed_power", t: "U24E" },
    { id: "exceedance_state", t: "EDI" },
    { id: "mean_active_power_1min", t: "U16" },
    { id: "max_power_withdrawn", t: "U24E" },
    { id: "max_power_injected", t: "U24E" },
    { id: "tangent_phi_withdrawn", t: "F32" },
    { id: "tangent_phi_injected", t: "F32" },
    { id: "tariff_processing_2", t: "ECO" },
    { id: "current_tarif_period_2", t: "EPT" },
    { id: "dynamic_tarif_period_2", t: "EPT" },
    { id: "notice_tarif_period_2", t: "EPT" },
    { id: "dynamic_period_2_start", t: "TSE" },
    { id: "dynamic_period_2_end", t: "TSE" },
    { id: "next_dynamic_period_2_start", t: "TSE" },
    { id: "next_dynamic_period_2_end", t: "TSE" },
    { id: "contract_period_2_start", t: "TS" },
    { id: "active_energy_withdrawn_period_2", t: "U24" },
    { id: "prev_contract_period_2_start", t: "TS" },
    { id: "prev_contract_period_2_end", t: "TS" },
    { id: "prev_active_energy_withdrawn_2", t: "U24" },
    { id: "exceedance_duration", t: "U24" }
  ]
  };

var ENUMS = {"EPT_VS":[[3," ? "],[4,"000"],[5,"HC"],[6,"HCD"],[7,"HCE"],[8,"HCH"],[9,"HH"],[10,"HH (padded)"],[11,"HP"],[12,"HP (padded)"],[13,"HPD"],[14,"HPE"],[15,"HPH"],[16,"JA"],[17,"JA (padded)"],[18,"P"],[19,"P (padded)"],[20,"PM"],[21,"PM (padded)"],[22,"other"]],"ECO_VS":[[3,"BT 4 SUP36"],[4,"BT 5 SUP36"],[5,"HTA 5"],[6,"HTA 8"],[7,"TJ EJP"],[8,"TJ EJP-HH"],[9,"TJ EJP-PM"],[10,"TJ EJP-SD"],[11,"TJ LU"],[12,"TJ LU-CH"],[13,"TJ LU-P"],[14,"TJ LU-PH"],[15,"TJ LU-SD"],[16,"TJ MU"],[17,"TV A5 BASE"],[18,"TV A8 BASE"]],"EDI_VS":[[3,"(two spaces)"],[4,"ACTIF"],[5,"CONSO"],[6,"CONTROLE"],[7,"DEP"],[8,"INACTIF"],[9,"PROD"],[10,"TEST"],[11,"kVA"],[12,"kW"]]};

function _tsIso(v) {
  var d = new Date((946684800 + v) * 1000);
  return d.getUTCFullYear() + '-' + _pad(d.getUTCMonth() + 1) + '-' + _pad(d.getUTCDate()) +
    'T' + _pad(d.getUTCHours()) + ':' + _pad(d.getUTCMinutes()) + ':' + _pad(d.getUTCSeconds()) + 'Z';
}
function _dmy(b, o) {
  // each byte is the plain decimal value (0x12 = day 18), not packed BCD
  return _pad(b[o]) + '/' + _pad(b[o + 1]) + '/' + _pad(b[o + 2]) +
    ' ' + _pad(b[o + 3]) + ':' + _pad(b[o + 4]) + ':' + _pad(b[o + 5]);
}
function _sdmy(b, o) {
  var s = String.fromCharCode(b[o]);
  for (var k = 1; k <= 6; k++) s += _pad(b[o + k]);
  return s;
}
function _tuple2(b, o) { return _pad(b[o]) + ':' + _pad(b[o + 1]); }
function _cstr(b, o, end) {
  var s = '';
  while (o < end && b[o] !== 0x00) { s += String.fromCharCode(b[o]); o++; }
  return { s: s, o: o + 1 };
}
function _enumField(b, o, end) {
  var h = b[o];
  if (h & 0x80) {
    var n = h & 0x7f;
    var s = '';
    for (var k = 1; k <= n && o + k < end; k++) s += String.fromCharCode(b[o + k]);
    return { v: s, o: o + 1 + n };
  }
  return { v: h, o: o + 1 };
}
function _hexn(b, o, n) {
  var s = '';
  for (var k = 0; k < n; k++) s += ('0' + b[o + k].toString(16)).slice(-2);
  return s.toUpperCase();
}
function _scaled(v, f) { return f ? Math.round(v * f * 1000) / 1000 : v; }

// descriptor -> ordered list of present field indexes (ALD 1.2 sections 3.3.3 / 3.4.2)
function _descriptor(b, o, end) {
  var h = b[o];
  var n = h & 0x1f;
  var obsolete = false, shifted = false, idx = [], p = o + 1;
  if ((h & 0x3f) === 0) {
    // original fixed bitfield: 8 raw bytes, b63 = obsolescence flag (ALD 1.2 sect. 3.3.3)
    if (p + 7 > end) return null;
    obsolete = (h & 0x80) !== 0;
    for (var bit = 62; bit >= 0; bit--) {
      var byteI = p - 1 + (7 - (bit >> 3));
      if (b[byteI] & (1 << (bit & 7))) idx.push(bit);
    }
    p += 7;
  } else if (n >= 2 && p + n - 1 <= end) {
    obsolete = (h & 0x80) !== 0;
    shifted = (h & 0x40) !== 0; // header b6
    var bytesN = n - 1;
    if ((h & 0x20) === 0) {
      for (var bit2 = bytesN * 8 - 1; bit2 >= 0; bit2--) {
        var byteJ = p + (bytesN - 1 - (bit2 >> 3));
        if (b[byteJ] & (1 << (bit2 & 7))) idx.push(bit2);
      }
    } else {
      for (var q = 0; q < bytesN; q++) idx.push(b[p + q]);
      idx.sort(function (a, c) { return a - c; });
    }
    p += bytesN;
  } else return null;
  idx.sort(function (a, c) { return a - c; });
  return { idx: idx, obsolete: obsolete, shifted: shifted, o: p };
}

function _field(f, b, o, end, out) {
  var t = f.t, v;
  switch (t) {
    case 'U8': out[f.id] = _scaled(_u8(b, o), f.scale); return o + 1;
    case 'U16': out[f.id] = _scaled(_u16(b, o), f.scale); return o + 2;
    case 'U24': out[f.id] = _scaled(_u24(b, o), f.scale); return o + 3;
    case 'U32': out[f.id] = _scaled(_u32(b, o), f.scale); return o + 4;
    case 'I16': out[f.id] = _i16(b, o); return o + 2;
    case 'F32': out[f.id] = _f32(b, o); return o + 4;
    case 'BF8': out[f.id] = _u8(b, o); return o + 1;
    case 'CH': out[f.id] = String.fromCharCode(b[o]); return o + 1;
    case 'CS': var c = _cstr(b, o, end); out[f.id] = c.s; return c.o;
    case 'DMY': out[f.id] = _dmy(b, o); return o + 6;
    case 'SDMY': out[f.id] = _sdmy(b, o); return o + 7;
    case 'TS': out[f.id] = _tsIso(_u32(b, o)); return o + 4;
    case 'HMDM': out[f.id] = _pad(b[o]) + ':' + _pad(b[o + 1]) + ':' + _pad(b[o + 2]) + ':' + _pad(b[o + 3]); return o + 4;
    case 'DMH': out[f.id] = _pad(b[o]) + ':' + _pad(b[o + 1]) + ':' + _pad(b[o + 2]); return o + 3;
    case 'HM': out[f.id] = _tuple2(b, o); return o + 2;
    case 'XBE': out[f.id] = _hexn(b, o, 4); return o + 4;
    case 'P11': out[f.id] = _hexn(b, o, 44); return o + 44;
    case 'HEX': var n = b[o]; out[f.id] = _hexn(b, o + 1, n); return o + 1 + n;
    case 'EPT': case 'ECO': case 'EDI':
      var e = _enumField(b, o, end); out[f.id] = e.v; return e.o;
    case 'U24E':
      if (o + 4 > end) return end;
      out[f.id] = _u24(b, o);
      var u = _enumField(b, o + 3, end); out[f.id + '_unit'] = u.v; return u.o;
    case 'TSE':
      if (o + 5 > end) return end;
      out[f.id + '_date'] = _tsIso(_u32(b, o));
      var e2 = _enumField(b, o + 4, end); out[f.id + '_tarif'] = e2.v; return e2.o;
    case 'SU8': case 'SU16': case 'SU24':
      if (o + 7 > end) return end;
      out[f.id + '_datetime'] = _sdmy(b, o);
      var o2 = o + 7, n2 = t === 'SU8' ? 1 : (t === 'SU16' ? 2 : 3);
      if (o2 + n2 > end) return end;
      out[f.id] = _scaled(t === 'SU8' ? _u8(b, o2) : (t === 'SU16' ? _u16(b, o2) : _u24(b, o2)), f.scale);
      return o2 + n2;
  }
  return o;
}

function _decodeTic(b, o, end, out) {
  // b[o] = cluster id hi... expects header already consumed; here: cid, aid, type, size
  if (o + 6 > end) return;
  var cid = _u16(b, o);
  if (cid !== CLUSTER_ID) return;
  var aid = _u16(b, o + 2);
  var attr = aid & 0x00ff;
  var prof = PROFILES[attr];
  if (!prof) return;
  var type = b[o + 4];
  var p = o + 5;
  var sz;
  if (type === 0x41) { sz = b[p]; p++; }
  else if (type === 0x43) { sz = _u16(b, p); p += 2; }
  else return;
  var dataEnd = Math.min(p + sz, end);
  var d = _descriptor(b, p, dataEnd);
  if (!d) return;
  if (d.obsolete) out.tic_data_obsolete = true;
  if (d.shifted) out.shifted_report = true;
  var off = d.o;
  for (var i = 0; i < d.idx.length; i++) {
    var f = prof[d.idx[i]];
    if (!f || off >= dataEnd) break;
    off = _field(f, b, off, dataEnd, out);
  }
}

function _decode(bytes, fPort) {
  var out = {};
  if (!bytes || bytes.length < 6) return out;
  out.raw_uplink = _hex(bytes);
  var cmd = bytes[1];
  if (cmd === 0x0A || cmd === 0x8A) {
    // report attributes / alarm report: <Fctrl><cmd><CID><AID><0x41><SZ><descriptor><fields>
    if (bytes[6] === 0x41) _decodeTic(bytes, 2, bytes.length, out);
  } else if (cmd === 0x01) {
    // read attribute response: <Fctrl><0x01><CID><AID><status><type><SZ><descriptor><fields>
    if (bytes.length > 7 && bytes[6] === 0x00) _decodeRead(bytes, out);
  }
  return out;
}
function _decodeRead(bytes, out) {
  var type = bytes[7];
  var p = 8;
  var sz;
  if (type === 0x41) { sz = bytes[p]; p++; }
  else if (type === 0x43) { sz = _u16(bytes, p); p += 2; }
  else return;
  var end = Math.min(p + sz, bytes.length);
  var aid = _u16(bytes, 4);
  var prof = PROFILES[aid & 0xff];
  if (!prof) return;
  var d = _descriptor(bytes, p, end);
  if (!d) return;
  if (d.obsolete) out.tic_data_obsolete = true;
  if (d.shifted) out.shifted_report = true;
  var off = d.o;
  for (var i = 0; i < d.idx.length; i++) {
    var f = prof[d.idx[i]];
    if (!f || off >= end) break;
    off = _field(f, bytes, off, end, out);
  }
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
