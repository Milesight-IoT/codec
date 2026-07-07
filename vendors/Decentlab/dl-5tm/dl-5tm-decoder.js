
/* https://www.decentlab.com/products/legacy-soil-moisture-and-temperature-sensor-for-lorawan */

var decentlab_decoder = {
  PROTOCOL_VERSION: 2,
  SENSORS: [
    {length: 2,
     values: [{name: 'dielectric_permittivity',
               displayName: 'Dielectric permittivity',
               convert: function (x) { return x[0] / 50; }},
              {name: 'volumetric_water_content',
               displayName: 'Volumetric water content',
               convert: function (x) { return 0.0000043 * Math.pow(x[0]/50, 3) - 0.00055 * Math.pow(x[0]/50, 2) + 0.0292 * (x[0]/50) - 0.053; },
               unit: 'm³⋅m⁻³'},
              {name: 'soil_temperature',
               displayName: 'Soil temperature',
               convert: function (x) { return (x[1] - 400) / 10; },
               unit: '°C'}]},
    {length: 1,
     values: [{name: 'battery_voltage',
               displayName: 'Battery voltage',
               convert: function (x) { return x[0] / 1000; },
               unit: 'V'}]}
  ],

  read_int: function (bytes, pos) {
    return (bytes[pos] << 8) + bytes[pos + 1];
  },

  decode: function (msg) {
    var bytes = msg;
    var i, j;
    if (typeof msg === 'string') {
      bytes = [];
      for (i = 0; i < msg.length; i += 2) {
        bytes.push(parseInt(msg.substring(i, i + 2), 16));
      }
    }

    var version = bytes[0];
    if (version != this.PROTOCOL_VERSION) {
      return {error: "protocol version " + version + " doesn't match v2"};
    }

    var deviceId = this.read_int(bytes, 1);
    var flags = this.read_int(bytes, 3);
    var result = {'protocol_version': version, 'device_id': deviceId};
    // decode payload
    var pos = 5;
    for (i = 0; i < this.SENSORS.length; i++, flags >>= 1) {
      if ((flags & 1) !== 1)
        continue;

      var sensor = this.SENSORS[i];
      var x = [];
      // convert data to 16-bit integer array
      for (j = 0; j < sensor.length; j++) {
        x.push(this.read_int(bytes, pos));
        pos += 2;
      }

      // decode sensor values
      for (j = 0; j < sensor.values.length; j++) {
        var value = sensor.values[j];
        if ('convert' in value) {
          result[value.name] = {displayName: value.displayName,
                                value: value.convert.bind(this)(x)};
          if ('unit' in value)
            result[value.name]['unit'] = value.unit;
        }
      }
    }
    return result;
  }
};


function _toHex(bytes) {
  return bytes.map(function(b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
function decodeUplink(input) {
  var hex = _toHex(input.bytes);
  var result = decentlab_decoder.decode(hex);
  var out = { raw_uplink: hex.toUpperCase() };
  if (!result || result.error) return { data: out };
  Object.keys(result).forEach(function(k) {
    if (k === 'protocol_version' || k === 'device_id') return;
    var v = result[k];
    out[k] = (v !== null && typeof v === 'object' && 'value' in v) ? v.value : v;
  });
  return { data: out };
}
function Decode(fPort, bytes) { return decodeUplink({ bytes: bytes, fPort: fPort }).data; }
function Decoder(bytes, port) { return decodeUplink({ bytes: bytes, fPort: port }).data; }
