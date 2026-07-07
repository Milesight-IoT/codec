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
	26: "R718DA",
    27: "R718DB",
	33: "R718J",
	37: "R718LB",
	39: "R718MBA",
	79: "R311FA",
	91: "R718Q",
	130: "R730MBA",
	137: "R730DA",
	139: "R730DB",
	141: "R730LB",
	151: "R718QA",
	158: "R311K",
	159: "R718VA",
	168: "R311DA",
	169: "R311DB",
	183: "R720F"
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
  if (devName == "R718DA")
	  return 26;
  else if (devName == "R718DB")
	  return 27;
  else if (devName == "R718J")
	  return 33;
  else if (devName == "R718LB")
	  return 37;
  else if (devName == "R718MBA")
	  return 39;
  else if (devName == "R311FA")
	  return 79;
  else if (devName == "R718Q")
      return 91;
  else if (devName == "R730MBA")
      return 130;
  else if (devName == "R730DA")
	  return 137;
  else if (devName == "R730DB")
	  return 139;
  else if (devName == "R730LB")
	  return 141;
  else if (devName == "R718QA")
      return 151;
  else if (devName == "R311K")
      return 158;
  else if (devName == "R718VA")
      return 159;
  else if (devName == "R311DA")
      return 168;
  else if (devName == "R311DB")
	  return 169;
  else if (devName == "R720F")
      return 183;
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

		data.status = input.bytes[4];
		
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
	  
	  port = 7;
	  ret = ret.concat(getCmdID, devid, (mint >> 8), (mint & 0xFF), (maxt >> 8), (maxt & 0xFF), batteryChg, 0x00, 0x00, 0x00, 0x00);
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

var _RENAME = {"Volt":"battery_voltage","status":"status1"};
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
