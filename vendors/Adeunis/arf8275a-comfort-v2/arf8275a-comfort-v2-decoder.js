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

    case 0x4c: {
      var pl = (bytes[1] & 0x04) ? bytes.length - 4 : bytes.length;
      var cap = Math.floor((pl - 2) / 3);
      out.appflag_2 = cap === 0;
      if (cap > 0) {
        out.temperature = _i16be(bytes,2)/10;
        out.humidity = bytes[4];
      }
      if (bytes[1] & 0x04) {
        var ts = (_u32be(bytes, pl) + 1356998400) * 1000;
        out.timestamp = new Date(ts).toJSON().replace('Z','');
      }
      break;
    }
    case 0x4d: {
      var st2 = bytes[2];
      out.temperature_alarm = !!(st2 >> 4);
      out.humidity_alarm = !!(st2 & 0x01);
      out.temperature = _i16be(bytes,3)/10;
      out.humidity = bytes[5];
      break;
    }
    case 0x51: {
      out.button_global_counter = _u32be(bytes,3);
      out.button_instant_counter = _u16be(bytes,7);
      break;
    }
    case 0x52: {
      out.dry_contact_global_counter = _u32be(bytes,3);
      out.dry_contact_instant_counter = _u16be(bytes,7);
      break;
    }
    default: break;
  }
  return out;
}
function decodeUplink(input){return {data:_decode(input.bytes)};}
function Decode(fPort,bytes){return _decode(bytes);}
function Decoder(bytes,port){return _decode(bytes);}
