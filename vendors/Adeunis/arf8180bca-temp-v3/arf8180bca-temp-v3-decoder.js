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

    case 0x57: {
      out.appflag_2 = false;
      var nb = (bytes[1] & 0x10) ? 2 : 1;
      var pl = (bytes[1] & 0x04) ? bytes.length - 4 : bytes.length;
      if (pl >= 2 + 2*nb) {
        out.sensor_1_temperature = _i16be(bytes,2)/10;
        if (nb === 2) out.sensor_2_temperature = _i16be(bytes,4)/10;
        out.sensor_1_temperature_error_detected = false;
        if (nb === 2) out.sensor_2_temperature_error_detected = false;
      }
      break;
    }
    case 0x58: {
      var nb = (bytes[1] & 0x10) ? 2 : 1;
      var st1 = bytes[2];
      out.sensor_1_alarm_high_temperature_threshold = st1 === 1;
      out.sensor_1_alarm_low_temperature_threshold = st1 === 2;
      out.sensor_1_temperature = _i16be(bytes,3)/10;
      out.sensor_1_temperature_error_detected = false;
      if (nb === 2) {
        var st2 = bytes[5];
        out.sensor_2_alarm_high_temperature_threshold = st2 === 1;
        out.sensor_2_alarm_low_temperature_threshold = st2 === 2;
        out.sensor_2_temperature = _i16be(bytes,6)/10;
        out.sensor_2_temperature_error_detected = false;
      }
      break;
    }
    case 0x20: {
      if (bytes.length >= 4) {
        out.lora_adr = !!(bytes[2] & 0x01);
        out.lora_duty_cycle = !!(bytes[2] & 0x04);
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
