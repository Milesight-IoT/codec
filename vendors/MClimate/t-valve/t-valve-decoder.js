function _mcDecode(input) {
	var bytes = input.bytes;
	var decbin = function(number) {
		return parseInt(number, 10).toString(2);
	};
	var byteArray = bytes.map(function(byte) {
		var number = decbin(byte);
		return Array(9 - number.length).join('0') + number;
	});

	var messageTypes = [ 'keepalive', 'testButtonPressed', 'floodDetected', 'controlButtonPressed', 'fraudDetected' ];
	toBool = function(value) {
		return value == '1';
	};
	shortPackage = function(byteArray) {
		return {
			data: {
				reason: 'keepalive',
				waterTemp: parseInt(byteArray[0], 2)/2,
				valveState: toBool(byteArray[1][0]),
				ambientTemp: (parseInt(byteArray[1].slice(1, 8), 2)-20)/2,
			}
		};
	};
	longPackage = function(byteArray) {
		return {
			data: {
				reason: messageTypes[parseInt(byteArray[0].slice(0, 3),2)],
				boxTamper: toBool(byteArray[0][4]),
				floodDetectionWireState: toBool(byteArray[0][5]),
				flood: toBool(byteArray[0][6]),
				magnet: toBool(byteArray[0][7]),
				alarmValidated: toBool(byteArray[1][0]),
				manualOpenIndicator: toBool(byteArray[1][1]),
				manualCloseIndicator: toBool(byteArray[1][2]),
				closeTime: parseInt(byteArray[2], 2),
				openTime: parseInt(byteArray[3], 2),
				battery: ((parseInt(byteArray[4], 2) * 8) + 1600)/1000,
			}
		};
	};
	if (byteArray.length > 2) {
		return longPackage(byteArray);
	} else {
		return shortPackage(byteArray);
	}
}



function _remap(d) {
  var out = {};
  if (d.reason                   !== undefined) out.reason                    = d.reason;
  if (d.waterTemp                !== undefined) out.water_temp                = d.waterTemp;
  if (d.valveState               !== undefined) out.valve_state               = d.valveState;
  if (d.ambientTemp              !== undefined) out.ambient_temp              = d.ambientTemp;
  if (d.boxTamper                !== undefined) out.box_tamper                = d.boxTamper;
  if (d.floodDetectionWireState  !== undefined) out.flood_detection_wire_state = d.floodDetectionWireState;
  if (d.flood                    !== undefined) out.flood                     = d.flood;
  if (d.magnet                   !== undefined) out.magnet                    = d.magnet;
  if (d.alarmValidated           !== undefined) out.alarm_validated           = d.alarmValidated;
  if (d.manualOpenIndicator      !== undefined) out.manual_open_indicator     = d.manualOpenIndicator;
  if (d.manualCloseIndicator     !== undefined) out.manual_close_indicator    = d.manualCloseIndicator;
  if (d.closeTime                !== undefined) out.close_time                = d.closeTime;
  if (d.openTime                 !== undefined) out.open_time                 = d.openTime;
  if (d.battery                  !== undefined) out.battery_voltage           = d.battery;
  return out;
}

function _toHex(bytes) {
  return bytes.map(function(b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('').toUpperCase();
}
function decodeUplink(input) {
  var raw = _toHex(input.bytes);
  var result = _mcDecode(input);
  var data = _remap(result.data || {});
  data.raw_uplink = raw;
  return { data: data };
}
function Decode(fPort, bytes) {
  return decodeUplink({ bytes: bytes, fPort: fPort }).data;
}
function Decoder(bytes, port) {
  return decodeUplink({ bytes: bytes, fPort: port }).data;
}