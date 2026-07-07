function decode(bytes,fPort){var d={};if(fPort!==6||!bytes||bytes.length<11)return d;if(bytes[2]===0x00)return d;if(bytes[2]===0x01){d.onoff_status=(bytes[3]===0x00)?"OFF":"ON";d.energy=(bytes[4]<<24)|(bytes[5]<<16)|(bytes[6]<<8)|bytes[7];d.over_current_alarm=(bytes[8]===0x00)?"No alarm":"Alarm";d.dash_current_alarm=(bytes[9]===0x00)?"No alarm":"Alarm";d.power_off_alarm=(bytes[10]===0x00)?"No alarm":"Alarm";}else{d.vol=(bytes[3]<<8)|bytes[4];d.current=(bytes[5]<<8)|bytes[6];d.power=(bytes[7]<<8)|bytes[8];}return d;}
function decodeUplink(input){return{data:decode(input.bytes,input.fPort)};}
function Decode(fPort,bytes){return decode(bytes,fPort);}
function Decoder(bytes,port){return decode(bytes,port);}
