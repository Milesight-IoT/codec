
/* https://www.decentlab.com/products/particulate-matter-temperature-humidity-and-barometric-pressure-sensor-for-lorawan */

var decentlab_decoder = {
  PROTOCOL_VERSION: 2,
  SENSORS: [
    {length: 1,
     values: [{name: 'battery_voltage',
               displayName: 'Battery voltage',
               convert: function (x) { return x[0] / 1000; },
               unit: 'V'}]},
    {length: 10,
     values: [{name: 'pm1_0_mass_concentration',
               displayName: 'PM1.0 mass concentration',
               convert: function (x) { return x[0] / 10; },
               unit: 'µg⋅m⁻³'},
              {name: 'pm2_5_mass_concentration',
               displayName: 'PM2.5 mass concentration',
               convert: function (x) { return x[1] / 10; },
               unit: 'µg⋅m⁻³'},
              {name: 'pm4_mass_concentration',
               displayName: 'PM4 mass concentration',
               convert: function (x) { return x[2] / 10; },
               unit: 'µg⋅m⁻³'},
              {name: 'pm10_mass_concentration',
               displayName: 'PM10 mass concentration',
               convert: function (x) { return x[3] / 10; },
               unit: 'µg⋅m⁻³'},
              {name: 'typical_particle_size',
               displayName: 'Typical particle size',
               convert: function (x) { return x[4]; },
               unit: 'nm'},
              {name: 'pm0_5_number_concentration',
               displayName: 'PM0.5 number concentration',
               convert: function (x) { return x[5] / 10; },
               unit: '1⋅cm⁻³'},
              {name: 'pm1_0_number_concentration',
               displayName: 'PM1.0 number concentration',
               convert: function (x) { return x[6] / 10; },
               unit: '1⋅cm⁻³'},
              {name: 'pm2_5_number_concentration',
               displayName: 'PM2.5 number concentration',
               convert: function (x) { return x[7] / 10; },
               unit: '1⋅cm⁻³'},
              {name: 'pm4_number_concentration',
               displayName: 'PM4 number concentration',
               convert: function (x) { return x[8] / 10; },
               unit: '1⋅cm⁻³'},
              {name: 'pm10_number_concentration',
               displayName: 'PM10 number concentration',
               convert: function (x) { return x[9] / 10; },
               unit: '1⋅cm⁻³'}]},
    {length: 2,
     values: [{name: 'air_temperature',
               displayName: 'Air temperature',
               convert: function (x) { return 175.72 * x[0] / 65536 - 46.85; },
               unit: '°C'},
              {name: 'air_humidity',
               displayName: 'Air humidity',
               convert: function (x) { return 125 * x[1] / 65536 - 6; },
               unit: '%'}]},
    {length: 1,
     values: [{name: 'barometric_pressure',
               displayName: 'Barometric pressure',
               convert: function (x) { return x[0] * 2; },
               unit: 'Pa'}]}
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
