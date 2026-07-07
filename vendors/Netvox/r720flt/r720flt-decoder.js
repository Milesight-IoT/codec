function getCfgCmd(cfgcmd){
  var cfgcmdlist = {
    1:   "ConfigReportReq",
    129: "ConfigReportRsp",
    2:   "ReadConfigReportReq",
    130: "ReadConfigReportRsp"
  };
  return cfgcmdlist[cfgcmd];
}

function getDeviceName(dev){
  var deviceName = {
	212: "R720FLT"
  };
  return deviceName[dev];
}

function getCmdToID(cmdtype){
  if (cmdtype == "ConfigReportReq")
	  return 1;
  else if (cmdtype == "ConfigReportRsp")
	  return 129;
  else if (cmdtype == "ReadConfigReportReq")
	  return 2;
  else if (cmdtype == "ReadConfigReportRsp")
	  return 130;
}

function getDeviceType(devName){
  if (devName == "R720FLT")
	  return 212;
}

function padLeft(str, len) {
    str = '' + str;
    if (str.length >= len) {
        return str;
    } else {
        return padLeft("0" + str, len);
    }
}

function _ttn_decodeUplink(input) {
  var data = {};
  switch (input.fPort) {
    case 6:
		if (input.bytes[2] === 0x00)
		{
			data.Device = getDeviceName(input.bytes[1]);
			data.SWver =  input.bytes[3]/10;
			data.HWver =  input.bytes[4];
			data.Datecode = padLeft(input.bytes[5].toString(16), 2) + padLeft(input.bytes[6].toString(16), 2) + padLeft(input.bytes[7].toString(16), 2) + padLeft(input.bytes[8].toString(16), 2);
			
			return {
				data: data,
			};
		}
		data.Device = getDeviceName(input.bytes[1]);
		if (input.bytes[3] & 0x80)
		{
			var tmp_v = input.bytes[3] & 0x7F;
			data.Volt = (tmp_v / 10).toString() + '(low battery)';
		}
		else
			data.Volt = input.bytes[3]/10;

		data.ReplenishWaterCount = (input.bytes[4] << 24) | (input.bytes[5] << 16 ) | (input.bytes[6] << 8) | input.bytes[7];
		data.FaultAlarm = input.bytes[8] ? 'Fault' : 'Normal';
		data.TankLeakAlarm = input.bytes[9] ? 'Leak' : 'NoLeak';
		
		break;
		
	case 7:
		data.Device = getDeviceName(input.bytes[1]);
		if (input.bytes[0] === 0x81)
		{
			data.Cmd = getCfgCmd(input.bytes[0]);
			data.Status = (input.bytes[2] === 0x00) ? 'Success' : 'Failure';
		}
		else if (input.bytes[0] === 0x82)
		{
			data.Cmd = getCfgCmd(input.bytes[0]);
			data.MinTime = (input.bytes[2]<<8 | input.bytes[3]);
			data.MaxTime = (input.bytes[4]<<8 | input.bytes[5]);
			data.BatteryChange = input.bytes[6]/10;
			data.ReplenishChange = (input.bytes[7] << 24) | (input.bytes[8] << 16) | (input.bytes[9] << 8) | input.bytes[10];
		}
		break;
		
	default:
      return {
        errors: ['unknown FPort'],
      };
	  
    }
          
	  
	 return {
		data: data,
	};
 }
  
function _ttn_encodeDownlink(input) {
  var ret = [];
  var devid;
  var port;
  var getCmdID;
	  
  getCmdID = getCmdToID(input.data.Cmd);
  devid = getDeviceType(input.data.Device);

  if (input.data.Cmd == "ConfigReportReq")
  {
	  var mint = input.data.MinTime;
	  var maxt = input.data.MaxTime;
	  var batteryChg = input.data.BatteryChange * 10;
	  var countChg = input.data.ReplenishChange
	  
	  port = 7;
	  ret = ret.concat(getCmdID, devid, (mint >> 8), (mint & 0xFF), (maxt >> 8), (maxt & 0xFF), batteryChg, (countChg >> 24), ((countChg >> 16) & 0xFF), ((countChg >> 8) & 0xFF), (countChg & 0xFF));
  }
  else if (input.data.Cmd == "ReadConfigReportReq")
  {
	  port = 7;
	  ret = ret.concat(getCmdID, devid, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
  }  
    
  return {
    fPort: port,
    bytes: ret
  };
}  
  
function _ttn_decodeDownlink(input) {
  var data = {};
  switch (input.fPort) {
    case 7:
		data.Device = getDeviceName(input.bytes[1]);
		if (input.bytes[0] === getCmdToID("ConfigReportReq"))
		{
			data.Cmd = getCfgCmd(input.bytes[0]);
			data.MinTime = (input.bytes[2]<<8 | input.bytes[3]);
			data.MaxTime = (input.bytes[4]<<8 | input.bytes[5]);
			data.BatteryChange = input.bytes[6]/10;
			data.ReplenishChange = (input.bytes[7] << 24) | (input.bytes[8] << 16) | (input.bytes[9] << 8) | input.bytes[10];
		}
		else if (input.bytes[0] === getCmdToID("ReadConfigReportReq"))
		{
			data.Cmd = getCfgCmd(input.bytes[0]);
		}
		break;
		
    default:
      return {
        errors: ['invalid FPort'],
      };
  }
  
  return {
		data: data,
	};
}

var _RENAME = {"Volt":"battery_voltage","ReplenishWaterCount":"replenish_water_count","FaultAlarm":"alarm","TankLeakAlarm":"water_leak"};
function _toSnake(k){return k.replace(/([a-z0-9])([A-Z])/g,'$1_$2').replace(/__+/g,'_').toLowerCase();}
function _remap(o){
  if(!o) return {};
  var r={};
  for(var k in o){
    if(k==='Device'||k==='Cmd') continue;
    var id = _RENAME[k] || _toSnake(k);
    r[id]=o[k];
  }
  if(r.battery===undefined && r.battery_voltage!==undefined){
    var bv=r.battery_voltage;
    if(typeof bv==='string' && bv.indexOf('low')>=0){ r.battery='Low'; }
    else { r.battery='Normal'; }
  }
  if(typeof r.battery_voltage==='string'){
    var m=r.battery_voltage.match(/([0-9.]+)/);
    if(m) r.battery_voltage = parseFloat(m[1]);
  }
  return r;
}
function decode(bytes, fPort){
  var b = Array.isArray(bytes)?bytes:Array.prototype.slice.call(bytes);
  var o = _ttn_decodeUplink({bytes:b, fPort:fPort});
  if(!o || !o.data) return {};
  return _remap(o.data);
}
function decodeUplink(input){ return { data: decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes){ return decode(bytes, fPort); }
function Decoder(bytes, port){ return decode(bytes, port); }
