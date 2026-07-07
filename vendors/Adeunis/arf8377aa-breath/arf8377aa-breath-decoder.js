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
    case 0x6d: {
      var len = st.hasTimestamp ? bytes.length - 4 : bytes.length;
      var capacity = Math.floor((len - 2) / 8);
      out.appflag_2 = capacity === 0;
      if (capacity > 0) {
        out.tvoc = _u16be(bytes, 2);
        out.pm10 = _u16be(bytes, 4);
        out.pm2_5 = _u16be(bytes, 6);
        out.pm1 = _u16be(bytes, 8);
      }
      break;
    }
    case 0x6e: {
      var s2 = bytes[2];
      out.tvoc_alarm = !!(s2 & 0x01);
      out.pm10_alarm = !!(s2 & 0x02);
      out.pm2_5_alarm = !!(s2 & 0x04);
      out.pm1_alarm = !!(s2 & 0x08);
      out.tvoc = _u16be(bytes, 3);
      out.pm10 = _u16be(bytes, 5);
      out.pm2_5 = _u16be(bytes, 7);
      out.pm1 = _u16be(bytes, 9);
      break;
    }
    case 0x30: {
      if (bytes.length >= 11) {
        out.tvoc_min = _u16be(bytes, 2);
        out.tvoc_max = _u16be(bytes, 4);
        out.tvoc_avg = _u16be(bytes, 6);
        out.tvoc_duration = _u16be(bytes, 8);
        if (bytes.length >= 18) {
          out.pm10_min = _u16be(bytes, 10);
          out.pm10_max = _u16be(bytes, 12);
          out.pm10_avg = _u16be(bytes, 14);
          out.pm10_duration = _u16be(bytes, 16);
        }
        if (bytes.length >= 26) {
          out.pm2_5_min = _u16be(bytes, 18);
          out.pm2_5_max = _u16be(bytes, 20);
          out.pm2_5_avg = _u16be(bytes, 22);
          out.pm2_5_duration = _u16be(bytes, 24);
        }
        if (bytes.length >= 32) {
          out.pm1_min = _u16be(bytes, 26);
          out.pm1_max = _u16be(bytes, 28);
          out.pm1_avg = _u16be(bytes, 30);
        }
      }
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