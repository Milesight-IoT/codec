function decode(bytes,fPort){var d={};if(fPort!==6||!bytes||bytes.length<11)return d;if(bytes[2]===0x00)return d;if(bytes[3]&0x80){d.battery="low";d.battery_voltage=(bytes[3]&0x7F)/10;}else{d.battery="ok";d.battery_voltage=bytes[3]/10;}var r=(bytes[4]<<8)|bytes[5];if(bytes[4]&0x80)r=r-0x10000;d.rssi=r;d.snr=bytes[6];d.heart_interval=(bytes[7]<<8)|bytes[8];return d;}
function decodeUplink(input){return{data:decode(input.bytes,input.fPort)};}
function Decode(fPort,bytes){return decode(bytes,fPort);}
function Decoder(bytes,port){return decode(bytes,port);}
