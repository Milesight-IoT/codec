function decode(bytes,fPort){var d={};if(fPort!==6||!bytes||bytes.length<11)return d;if(bytes[2]===0x00)return d;if(bytes[3]&0x80){d.battery="low";d.battery_voltage=(bytes[3]&0x7F)/10;}else{d.battery="ok";d.battery_voltage=bytes[3]/10;}var st=bytes[2];if(st===0x01){var t=(bytes[4]<<8)|bytes[5];if(bytes[4]&0x80)t=t-0x10000;d.temperature=t/100;d.humidity=((bytes[6]<<8)|bytes[7])/100;d.co2=(bytes[8]<<8)|bytes[9];d.shock_event=bytes[10];}else if(st===0x02){d.airpressure=((bytes[4]<<24)|(bytes[5]<<16)|(bytes[6]<<8)|bytes[7])/100;d.illuminance_lux=(bytes[8]<<16)|(bytes[9]<<8)|bytes[10];}return d;}
function decodeUplink(input){return{data:decode(input.bytes,input.fPort)};}
function Decode(fPort,bytes){return decode(bytes,fPort);}
function Decoder(bytes,port){return decode(bytes,port);}
