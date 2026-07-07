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
  switch(fc){
    case 0x49:
    case 0x4a: {
      out.tic_error = !!(bytes[1] & 0x10);
      out.config_error = st.configurationInconsistency;
      out.hardware_error = !!(bytes[1] & 0x40);
      out.data_PTCOUR1_index = bytes[2];
      var regs = [330,332,334,336,338,340,342,344,346,348,350,352];
      var ridx = 0;
      for (var p = 3; p + 3 < bytes.length && ridx < regs.length; p += 4) {
        out['data_S' + regs[ridx]] = _u32be(bytes, p);
        ridx++;
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