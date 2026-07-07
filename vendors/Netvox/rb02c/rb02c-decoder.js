function decode(bytes,fPort){var b=bytes;var d={};if(fPort===6){if(b[2]===0x00){d.sw_version=b[3]/10;d.hw_version=b[4];d.datecode=('0'+b[5].toString(16)).slice(-2)+('0'+b[6].toString(16)).slice(-2)+('0'+b[7].toString(16)).slice(-2)+('0'+b[8].toString(16)).slice(-2);return d;}var v;if(b[3]&0x80){v=(b[3]&0x7F)/10;}else{v=b[3]/10;}d.battery_voltage=v;d.key_1=b[4];d.key_2=b[5];if(b[1]===0xA7){d.key_3=b[6];}return d;}if(fPort===7){d.cmd_id=b[0];return d;}return d;}
function decodeUplink(input){return {data:decode(input.bytes,input.fPort)};}
function Decode(fPort,bytes){return decode(bytes,fPort);}
function Decoder(bytes,port){return decode(bytes,port);}
