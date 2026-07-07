function _u16be(b,o){return (b[o]<<8)|b[o+1];}
function _i16be(b,o){var v=_u16be(b,o);return v&0x8000?v-0x10000:v;}
function _u32be(b,o){return ((b[o]<<24)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3])>>>0;}
function _i32be(b,o){return ((b[o]<<24)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3])|0;}
function _f32be(b,o){var v=_u32be(b,o);return new Float32Array(new Uint32Array([v]).buffer)[0];}
function _statusFlags(b){var s=b[1];return {lowBattery:!!(s&0x02),configurationInconsistency:!!(s&0x08),hasTimestamp:!!(s&0x04),frameCounter:(s>>5)&0x07};}
function _productMode(v){return v===0?'PARK':v===1?'PRODUCTION':v===2?'TEST':v===3?'DEAD':'';}
function _decode(bytes){
  if(!bytes||bytes.length<2) return {};
  var fc=bytes[0];
  var st=_statusFlags(bytes);
  var out={};
  out.battery=st.lowBattery?'low':'ok';
  out.appflag_1=st.configurationInconsistency;
  switch(fc){

    case 0x40: {
      out.input_1_counter = _u16be(bytes,2);
      out.input_2_counter = _u16be(bytes,4);
      out.input_3_counter = _u16be(bytes,6);
      out.input_4_counter = _u16be(bytes,8);
      var s = bytes[10];
      out.input_1_current_state = !!(s & 0x01);
      out.input_1_previous_frame_state = !!(s & 0x02);
      out.input_2_current_state = !!(s & 0x04);
      out.input_2_previous_frame_state = !!(s & 0x08);
      out.input_3_current_state = !!(s & 0x10);
      out.input_3_previous_frame_state = !!(s & 0x20);
      out.input_4_current_state = !!(s & 0x40);
      out.input_4_previous_frame_state = !!(s & 0x80);
      break;
    }
    case 0x10: {
      out.keep_alive_period = _u16be(bytes,2) * 10;
      out.transmit_period = _u16be(bytes,4) * 10;
      break;
    }
    case 0x20: {
      if (bytes.length >= 4) {
        out.lora_adr = !!(bytes[2] & 0x01);
        out.lora_duty_cycle = (bytes[2] & 0x04) ? 'activated' : 'deactivated';
        out.lora_class_mode = (bytes[2] & 0x20) ? 'CLASS C' : 'CLASS A';
        out.lora_provisioning_mode = bytes[3] === 0 ? 'ABP' : 'OTAA';
        out.missing_network = false;
      } else {
        out.missing_network = true;
      }
      break;
    }
    default: break;
  }
  return out;
}
function decodeUplink(input){return {data:_decode(input.bytes)};}
function Decode(fPort,bytes){return _decode(bytes);}
function Decoder(bytes,port){return _decode(bytes);}
