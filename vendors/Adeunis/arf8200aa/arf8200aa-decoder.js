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

    case 0x42: {
      var t1 = bytes[2] & 0x0f;
      var v1 = _u32be(bytes,2) & 0x00ffffff;
      var t2 = bytes[6] & 0x0f;
      var v2 = _u32be(bytes,6) & 0x00ffffff;
      out.channel_a_alarm = !!(bytes[1] & 0x08);
      out.channel_b_alarm = !!(bytes[1] & 0x10);
      if (t1 === 1) out.channel_a_voltage = parseFloat((v1/1e6).toFixed(3));
      else if (t1 === 2) out.channel_a_current = parseFloat((v1/1e5).toFixed(3));
      if (t2 === 1) out.channel_b_voltage = parseFloat((v2/1e6).toFixed(3));
      else if (t2 === 2) out.channel_b_current = parseFloat((v2/1e5).toFixed(3));
      break;
    }
    case 0x20: {
      if (bytes.length >= 4) {
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
