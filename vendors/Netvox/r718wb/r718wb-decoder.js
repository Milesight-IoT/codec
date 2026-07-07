function getCfgCmd(cfgcmd){
  var cfgcmdlist = {
    1:   "ConfigReportReq",
    129: "ConfigReportRsp",
    2:   "ReadConfigReportReq",
    130: "ReadConfigReportRsp"
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
}

function getLeakSensorCount(dev){
  var deviceName = {
  	"R311W": 2,
	"R718WA": 1,
	"R718WB": 1,
	"R718WA2": 2,
	"R718WB2": 2
  };

  return deviceName[dev];
}

function getDeviceName(dev){
  var deviceName = {
	6: "R311W",
	50: "R718WA",
	18: "R718WB",
	70: "R718WA2",
	71: "R718WB2"
  };
  return deviceName[dev];
}

function getDeviceID(devName){
  var deviceName = {
	"R311W": 6,
	"R718WA": 50,
	"R718WB": 18,
	"R718WA2": 70,
	"R718WB2": 71
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

		if (getLeakSensorCount(data.Device) > 1)
		{
		  data.WaterLeak_1 = (input.bytes[4] == 0x00) ? 'NoLeak' : 'Leak';
		  data.WaterLeak_2 = (input.bytes[5] == 0x00) ? 'NoLeak' : 'Leak';
		}
		else
		{
		  data.WaterLeak = (input.bytes[4] == 0x00) ? 'NoLeak' : 'Leak';
		}

		break;
		
	case 7:
		data.Cmd = getCfgCmd(input.bytes[0]);
		data.Device = getDeviceName(input.bytes[1]);
		if (input.bytes[0] === getCmdToID("ConfigReportRsp"))
		{
			data.Status = (input.bytes[2] === 0x00) ? 'Success' : 'Failure';
		}
		else if (input.bytes[0] === getCmdToID("ReadConfigReportRsp"))
		{
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
  var getCmdID;
	  
  getCmdID = getCmdToID(input.data.Cmd);
  devid = getDeviceID(input.data.Device);

  if (input.data.Cmd == "ConfigReportReq")
  {
	  var mint = input.data.MinTime;
	  var maxt = input.data.MaxTime;
	  var batteryChg = input.data.BatteryChange * 10;
	  
	  ret = ret.concat(getCmdID, devid, (mint >> 8), (mint & 0xFF), (maxt >> 8), (maxt & 0xFF), batteryChg, 0x00, 0x00, 0x00, 0x00);
  }
  else if (input.data.Cmd == "ReadConfigReportReq")
  {
	  ret = ret.concat(getCmdID, devid, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
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

var _RENAME = {"Volt":"battery_voltage","WaterLeak":"water_leak"};
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
