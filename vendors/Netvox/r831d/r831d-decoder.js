function decode(bytes,fPort){var b=bytes;var d={};if(fPort===6){if(b[2]===0x00){d.sw_version=b[3]/10;d.hw_version=b[4];d.datecode=('0'+b[5].toString(16)).slice(-2)+('0'+b[6].toString(16)).slice(-2)+('0'+b[7].toString(16)).slice(-2)+('0'+b[8].toString(16)).slice(-2);return d;}d.relay_1=b[3]?1:0;d.relay_2=b[4]?1:0;d.relay_3=b[5]?1:0;d.input_1=b[6]?1:0;d.input_2=b[7]?1:0;d.input_3=b[8]?1:0;return d;}if(fPort===7){d.cmd_id=b[0];return d;}return d;}
function decodeUplink(input){return {data:decode(input.bytes,input.fPort)};}
function Decode(fPort,bytes){return decode(bytes,fPort);}
function Decoder(bytes,port){return decode(bytes,port);}
