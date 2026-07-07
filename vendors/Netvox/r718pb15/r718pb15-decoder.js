function decode(bytes,fPort){var d={};if(fPort!==6||!bytes||bytes.length<11)return d;if(bytes[2]===0x00)return d;if(bytes[3]&0x80){d.battery="low";d.battery_voltage=(bytes[3]&0x7F)/10;}else{d.battery="ok";d.battery_voltage=bytes[3]/10;}if(bytes[2]===0x0A){d["5tesoilhumidity"]=((bytes[4]<<8)|bytes[5])*0.01;d["5tesoiltemp"]=((bytes[6]<<8)|bytes[7])*0.01;d.waterlevel=(bytes[8]<<8)|bytes[9];d["5tesoilconductivity"]=bytes[10]*0.1;}return d;}
function decodeUplink(input){return{data:decode(input.bytes,input.fPort)};}
function Decode(fPort,bytes){return decode(bytes,fPort);}
function Decoder(bytes,port){return decode(bytes,port);}
