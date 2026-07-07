function _u16be(b,o){return (b[o]<<8)|b[o+1];}
function _i16be(b,o){var v=_u16be(b,o);return v&0x8000?v-0x10000:v;}
function _u32be(b,o){return ((b[o]<<24)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3])>>>0;}
function _i32be(b,o){return ((b[o]<<24)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3])|0;}
function _statusFlags(b){var s=b[1];return {lowBattery:!!(s&0x02),configurationInconsistency:!!(s&0x08),hasTimestamp:!!(s&0x04)};}
function _decode(bytes){
  if(!bytes||bytes.length<2) return {};
  var fc=bytes[0];
  var st=_statusFlags(bytes);
  var out={};
  out.battery=st.lowBattery?'low':'ok';
  out.appflag_1=st.configurationInconsistency;
  switch(fc){
    case 0x6a: {
      var len = st.hasTimestamp ? bytes.length - 4 : bytes.length;
      var capacity = Math.floor((len - 2) / 7);
      out.appflag_2 = capacity === 0;
      if (capacity > 0) {
        out.temperature = _i16be(bytes, 2) / 10;
        out.humidity = bytes[4];
        out.co2 = _u16be(bytes, 5);
        out.voc = _u16be(bytes, 7);
      }
      break;
    }
    case 0x6b: {
      var s2 = bytes[2];
      out.temperature_alarm = !!(s2 & 0x10);
      out.humidity_alarm = !!(s2 & 0x01);
      out.co2_alarm = !!(s2 & 0x20);
      out.voc_alarm = !!(s2 & 0x40);
      out.temperature = _i16be(bytes, 3) / 10;
      out.humidity = bytes[5];
      out.co2 = _u16be(bytes, 6);
      out.voc = _u16be(bytes, 8);
      break;
    }
    case 0x6f: {
      var ridx = 0;
      for (var p = 2; p + 1 < bytes.length && ridx < 3; p += 2) {
        out['register_value' + (ridx+1)] = _u16be(bytes, p);
        ridx++;
      }
      break;
    }
    case 0x51: {
      out.button_global_counter = _u32be(bytes, 3);
      out.button_instant_counter = _u16be(bytes, 7);
      break;
    }
    case 0x52: {
      out.dry_contact_global_counter = _u32be(bytes, 3);
      out.dry_contact_instant_counter = _u16be(bytes, 7);
      break;
    }
    case 0x20: {
      if (bytes.length === 4) {
        out.lora_adr = !!(bytes[2] & 0x01);
        out.lora_duty_cycle = (bytes[2] & 0x04) ? 'activated' : 'deactivated';
        out.lora_class_mode = (bytes[2] & 0x20) ? 'CLASS C' : 'CLASS A';
        out.lora_provisioning_mode = bytes[3] === 0 ? 'ABP' : 'OTAA';
        out.missing_network = false;
      } else { out.missing_network = true; }
      break;
    }
    default: break;
  }
  return out;
}
function decodeUplink(input){return {data:_decode(input.bytes)};}
function Decode(fPort,bytes){return _decode(bytes);}
function Decoder(bytes,port){return _decode(bytes);}