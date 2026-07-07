function decode(bytes,fPort){var d={};if(fPort!==6||!bytes||bytes.length<11)return d;if(bytes[2]===0x00)return d;if(bytes[3]&0x80){d.battery="low";d.battery_voltage=(bytes[3]&0x7F)/10;}else{d.battery="ok";d.battery_voltage=bytes[3]/10;}if(bytes[2]===0x09){d.ntu=((bytes[4]<<8)|bytes[5])*0.1;var t=(bytes[6]<<8)|bytes[7];d.temperaturewithntu=t*0.01;d.ec5soilhumidity=((bytes[8]<<8)|bytes[9])*0.01;}return d;}
function decodeUplink(input){return{data:decode(input.bytes,input.fPort)};}
function Decode(fPort,bytes){return decode(bytes,fPort);}
function Decoder(bytes,port){return decode(bytes,port);}
