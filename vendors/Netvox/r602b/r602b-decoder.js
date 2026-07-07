function decode(bytes,fPort){var d={};if(fPort!==6||!bytes||bytes.length<11)return d;if(bytes[2]===0x00)return d;d.heart_interval=(bytes[3]<<8)|bytes[4];d.alarm=(bytes[5]===0x00)?"No warning":"Warning";if(bytes[6]&0x80){d.battery="low";d.battery_voltage=(bytes[6]&0x7F)/10;}else{d.battery="ok";d.battery_voltage=bytes[6]/10;}return d;}
function decodeUplink(input){return{data:decode(input.bytes,input.fPort)};}
function Decode(fPort,bytes){return decode(bytes,fPort);}
function Decoder(bytes,port){return decode(bytes,port);}
