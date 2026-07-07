function _u16be(b,o){return (b[o]<<8)|b[o+1];}
function _i16be(b,o){var v=_u16be(b,o);return v&0x8000?v-0x10000:v;}
function _decode(bytes){
  if(!bytes||bytes.length<1) return {};
  var status = bytes[0];
  var out = {};
  var i = 1;
  if (status & 0x80) {
    var deg = (bytes[i]>>4)*10 + (bytes[i]&0x0f);
    var min1 = (bytes[i+1]>>4)*10 + (bytes[i+1]&0x0f);
    var min2 = (bytes[i+2]>>4)*10 + (bytes[i+2]&0x0f);
    var sign = (bytes[i+3] & 0x01) ? '-' : '+';
    out.gps_latitude = sign + deg + '°' + min1 + '.' + min2 + '\'';
    i += 4;
    var degL = (bytes[i]>>4)*100 + (bytes[i]&0x0f)*10 + (bytes[i+1]>>4);
    var minL1 = (bytes[i+1]&0x0f)*10 + (bytes[i+2]>>4);
    var minL2 = (bytes[i+2]&0x0f)*10 + (bytes[i+3]>>4);
    var signL = (bytes[i+4] & 0x01) ? '-' : '+';
    out.gps_longitude = signL + degL + '°' + minL1 + '.' + minL2 + '\'';
    i += 5;
  }
  if (status & 0x40) { out.uplink_counter = bytes[i] * 256 + bytes[i+1]; i += 2; }
  if (status & 0x20) { out.downlink_counter = bytes[i] * 256 + bytes[i+1]; i += 2; }
  if (status & 0x10) { out.battery = String(_u16be(bytes, i)); i += 2; }
  if (status & 0x08) {
    out.rssi = _i16be(bytes, i); i += 2;
    out.snr = bytes[i] & 0x80 ? bytes[i] - 256 : bytes[i]; i += 1;
  }
  return out;
}
function decodeUplink(input){return {data:_decode(input.bytes)};}
function Decode(fPort,bytes){return _decode(bytes);}
function Decoder(bytes,port){return _decode(bytes);}