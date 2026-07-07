function decode(bytes,fPort){var d={};if(fPort!==6||!bytes||bytes.length<11)return d;if(bytes[2]===0x00)return d;if(bytes[3]&0x80){d.battery="low";d.battery_voltage=(bytes[3]&0x7F)/10;}else{d.battery="ok";d.battery_voltage=bytes[3]/10;}var t1=(bytes[4]<<8)|bytes[5];if(bytes[4]&0x80)t1=t1-0x10000;d.temperature1=t1/10;var t2=(bytes[6]<<8)|bytes[7];if(bytes[6]&0x80)t2=t2-0x10000;d.temperature2=t2/10;return d;}
function decodeUplink(input){return{data:decode(input.bytes,input.fPort)};}
function Decode(fPort,bytes){return decode(bytes,fPort);}
function Decoder(bytes,port){return decode(bytes,port);}
