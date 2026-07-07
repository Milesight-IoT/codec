function getCfgCmd(cfgcmd){
	var cfgcmdlist = {
	  1:   "ConfigReportReq",
	  129: "ConfigReportRsp",
	  2:   "ReadConfigReportReq",
	  130: "ReadConfigReportRsp",
	  3:   "SetOnDistanceThresholdReq",
	  131: "SetOnDistanceThresholdRsp",
	  4:   "GetOnDistanceThresholdReq",
	  132: "GetOnDistanceThresholdRsp",
	  5:   "SetFillMaxDistanceReq",
	  133: "SetFillMaxDistanceRsp",
	  6:   "GetFillMaxDistanceReq",
	  134: "GetFillMaxDistanceRsp",
	  11:  "SetDeadZoneDistanceReq",
	  139: "SetDeadZoneDistanceRsp",
	  12:  "GetDeadZoneDistanceReq",
	  140: "GetDeadZoneDistanceRsp"
	};
	return cfgcmdlist[cfgcmd];
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
	else if (cmdtype == "SetOnDistanceThresholdReq")
		return 3;
	else if (cmdtype == "SetOnDistanceThresholdRsp")
		return 131;
	else if (cmdtype == "GetOnDistanceThresholdReq")
		return 4;
	else if (cmdtype == "GetOnDistanceThresholdRsp")
		return 132;
	else if (cmdtype == "SetFillMaxDistanceReq")
		return 5;
	else if (cmdtype == "SetFillMaxDistanceRsp")
		return 133;
	else if (cmdtype == "GetFillMaxDistanceReq")
		return 6;
	else if (cmdtype == "GetFillMaxDistanceRsp")
		return 134;
	else if (cmdtype == "SetDeadZoneDistanceReq")
		return 11;
	else if (cmdtype == "SetDeadZoneDistanceRsp")
		return 139;
	else if (cmdtype == "GetDeadZoneDistanceReq")
		return 12;
	else if (cmdtype == "GetDeadZoneDistanceRsp")
		return 140;
}
  
function getDeviceName(dev){
	var deviceName = {
	  52: "R718X",
	  177:"R718PE"
	};
	return deviceName[dev];
}
  
function getDeviceID(devName){
	var deviceName = {
	  "R718X": 52,
	  "R718PE": 177
	};
	return deviceName[devName];
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

			data.Status = (input.bytes[4] === 0x00) ? 'OFF' : 'ON';
			data.Distance = (input.bytes[5]<<8 | input.bytes[6]);
			data.FillLevel = (input.bytes[1] === 0x34) ? input.bytes[9] : input.bytes[7];

			if (input.bytes[1] === 0x34)
			{
				if (input.bytes[7] & 0x80)
				{
					var tmpval = (input.bytes[7]<<8 | input.bytes[8]);
					data.Temp = (0x10000 - tmpval)/10 * -1;
				}
				else
					data.Temp = (input.bytes[7]<<8 | input.bytes[8])/10;

				data.AngleOfInclination = input.bytes[10];
			}


		 	break;
		  
		case 7:
			data.Cmd = getCfgCmd(input.bytes[0]);
			data.Device = getDeviceName(input.bytes[1]);
			if ((input.bytes[0] === getCmdToID("ConfigReportRsp")) || (input.bytes[0] === getCmdToID("SetOnDistanceThresholdRsp")) || (input.bytes[0] === getCmdToID("SetFillMaxDistanceRsp")) || (input.bytes[0] === getCmdToID("SetDeadZoneDistanceRsp")))
			{
				data.Status = (input.bytes[2] === 0x00) ? 'Success' : 'Failure';
			}
			else if (input.bytes[0] === getCmdToID("ReadConfigReportRsp"))
			{
				data.MinTime = (input.bytes[2]<<8 | input.bytes[3]);
				data.MaxTime = (input.bytes[4]<<8 | input.bytes[5]);
				data.BatteryChange = input.bytes[6]/10;
				data.DistanceChange = (input.bytes[7]<<8 | input.bytes[8]);
				if (input.bytes[1] === 0x34)
					data.TempChange = (input.bytes[9]<<8 |  input.bytes[10])/10;
			}
			else if (input.bytes[0] === getCmdToID("GetOnDistanceThresholdRsp"))
			{
				data.OnDistanceThreshold = (input.bytes[2]<<8 | input.bytes[3]);
			}
			else if (input.bytes[0] === getCmdToID("GetFillMaxDistanceRsp"))
			{
				data.FillMaxDistance = (input.bytes[2]<<8 | input.bytes[3]);
			}
			else if (input.bytes[0] === getCmdToID("GetDeadZoneDistanceRsp"))
			{
				data.DeadZoneDistance = (input.bytes[2]<<8 | input.bytes[3]);
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
	var getCmdID;
		
	getCmdID = getCmdToID(input.data.Cmd);
	devid = getDeviceID(input.data.Device);
	if (input.data.Cmd == "ConfigReportReq")
	{
		var mint = input.data.MinTime;
		var maxt = input.data.MaxTime;
		var batteryChg = input.data.BatteryChange * 10;
		var disChg = input.data.DistanceChange;
		if (devid == 0x34)
		{
			var tempChg = input.data.TempChange * 10;
		
			ret = ret.concat(getCmdID, devid, (mint >> 8), (mint & 0xFF), (maxt >> 8), (maxt & 0xFF), batteryChg, (disChg >> 8), (disChg & 0xFF), (tempChg >> 8), (tempChg & 0xFF));
		}
		else if (devid == 0xB1)
			ret = ret.concat(getCmdID, devid, (mint >> 8), (mint & 0xFF), (maxt >> 8), (maxt & 0xFF), batteryChg, (disChg >> 8), (disChg & 0xFF), 0x00, 0x00);
	}
	else if ((input.data.Cmd == "ReadConfigReportReq") || (input.data.Cmd == "GetOnDistanceThresholdReq") || (input.data.Cmd == "GetFillMaxDistanceReq") || (input.data.Cmd == "GetDeadZoneDistanceReq"))
	{
		ret = ret.concat(getCmdID, devid, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
	}  
	else if (input.data.Cmd == "SetOnDistanceThresholdReq")
	{
		var d = input.data.OnDistanceThreshold;
		
		ret = ret.concat(getCmdID, devid, (d >> 8), (d & 0xFF), 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
	}
	else if (input.data.Cmd == "SetFillMaxDistanceReq")
	{
		var d = input.data.FillMaxDistance;
		
		ret = ret.concat(getCmdID, devid, (d >> 8), (d & 0xFF), 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
	}
	else if (input.data.Cmd == "SetDeadZoneDistanceReq")
	{
		var d = input.data.DeadZoneDistance;
		
		ret = ret.concat(getCmdID, devid, (d >> 8), (d & 0xFF), 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
	}

	return {
	  	fPort: 7,
		bytes: ret
	};
}  
	
function _ttn_decodeDownlink(input) {
	var data = {};
	switch (input.fPort) {
		case 7:
			data.Cmd = getCfgCmd(input.bytes[0]);
			data.Device = getDeviceName(input.bytes[1]);
			if (input.bytes[0] === getCmdToID("ConfigReportReq"))
			{
				data.MinTime = (input.bytes[2]<<8 | input.bytes[3]);
				data.MaxTime = (input.bytes[4]<<8 | input.bytes[5]);
				data.BatteryChange = input.bytes[6]/10;
				data.DistanceChange = (input.bytes[7]<<8 | input.bytes[8]);
				if (input.bytes[1] === 0x34)
					data.TempChange = (input.bytes[9]<<8 |  input.bytes[10])/10;
			}
			else if (input.bytes[0] == getCmdToID("SetOnDistanceThresholdReq"))
			{
				data.OnDistanceThreshold = (input.bytes[2]<<8 | input.bytes[3]);
			}
			else if (input.bytes[0] == getCmdToID("SetFillMaxDistanceReq"))
			{
				data.FillMaxDistance = (input.bytes[2]<<8 | input.bytes[3]);
			}
			else if (input.bytes[0] == getCmdToID("SetDeadZoneDistanceReq"))
			{
				data.DeadZoneDistance = (input.bytes[2]<<8 | input.bytes[3]);
			}
			break;
			
		default:
			return {
				rrors: ['invalid FPort'],
			};
	}
	
	return {
		data: data,
	};
}
  
var _RENAME = {"Volt":"battery_voltage","Status":"onoff_status","Distance":"distance","Temp":"temperature","FillLevel":"fill_level","AngleOfInclination":"angle"};
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
