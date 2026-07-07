function _mcDecode(input) {
	var bytes = input.bytes;
	var decbin = function(number) {
		return parseInt(number, 10).toString(2);
	};
	var byteArray = bytes.map(function(byte) {
		var number = decbin(byte);
		return Array(9 - number.length).join('0') + number;
	});
	var messageTypes = [ 'keepalive', 'testButtonPressed', 'floodDetected', 'fraudDetected' ];
	toBool = function(value) {
		return value == '1';
	};
	shortPackage = function(byteArray) {
		return {
			data: {
                reason: messageTypes[parseInt(byteArray[0].slice(0, 3),2)],
                boxTamper: toBool(byteArray[0][4]),
                flood: toBool(byteArray[0][6]),
                battery: (parseInt(byteArray[1], 2) * 16)/1000,
			}
		};
	};
	longPackage = function(byteArray) {
		return {
			data: {
                reason: messageTypes[parseInt(byteArray[0].slice(0, 3),2)],
                boxTamper: toBool(byteArray[0][4]),
                flood: toBool(byteArray[0][6]),
                battery: (parseInt(byteArray[1], 2) * 16)/1000,
                temperature: parseInt(byteArray[2], 2),
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
  if (d.reason      !== undefined) out.reason      = d.reason;
  if (d.boxTamper   !== undefined) out.box_tamper  = d.boxTamper ? 1 : 0;
  if (d.flood       !== undefined) out.flood       = d.flood ? 1 : 0;
  if (d.battery     !== undefined) out.battery     = d.battery;
  if (d.temperature !== undefined) out.temperature = d.temperature;
  return out;
}
function decodeUplink(input) { return { data: _remap((_mcDecode(input) || {}).data || {}) }; }
function Decode(fPort, bytes) { return _remap((_mcDecode({ bytes: bytes, fPort: fPort }) || {}).data || {}); }
function Decoder(bytes, port) { return _remap((_mcDecode({ bytes: bytes, fPort: port }) || {}).data || {}); }
