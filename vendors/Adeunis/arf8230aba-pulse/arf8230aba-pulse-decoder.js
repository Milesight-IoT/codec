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
    case 0x46: {
      out.channel_a_counter = _u32be(bytes, 2);
      out.channel_b_counter = _u32be(bytes, 6);
      break;
    }
    case 0x47: {
      out.channel_a_flow = _u16be(bytes, 2);
      out.channel_b_flow = _u16be(bytes, 4);
      break;
    }
    case 0x30: {
      var s2 = bytes[2];
      out.channel_a_flow_alarm = !!(s2 & 0x01);
      out.channel_b_flow_alarm = !!(s2 & 0x02);
      out.channel_a_fraud_alarm = !!(s2 & 0x04);
      out.channel_b_fraud_alarm = !!(s2 & 0x08);
      out.channel_a_leakage_alarm = !!(s2 & 0x10);
      out.channel_b_leakage_alarm = !!(s2 & 0x20);
      out.flow_alarm = !!(s2 & 0x3f);
      out.channel_a_last_24h_max_flow = _u16be(bytes, 3);
      out.channel_b_last_24h_max_flow = _u16be(bytes, 5);
      out.channel_a_last_24h_min_flow = _u16be(bytes, 7);
      out.channel_b_last_24h_min_flow = _u16be(bytes, 9);
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