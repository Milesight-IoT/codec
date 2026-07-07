function decode(bytes, fPort) {
  var b = bytes;
  var d = {};
  if (fPort === 6) {
    if (b[2] === 0x00) {
      d.sw_version = b[3] / 10;
      d.hw_version = b[4];
      d.datecode = ('0' + b[5].toString(16)).slice(-2) + ('0' + b[6].toString(16)).slice(-2) + ('0' + b[7].toString(16)).slice(-2) + ('0' + b[8].toString(16)).slice(-2);
      return d;
    }
    var v;
    if (b[3] & 0x80) {
      v = (b[3] & 0x7F) / 10;
    } else {
      v = b[3] / 10;
    }
    d.battery_voltage = v;
    var rt = b[2];
    if (rt === 0x01) {
      d.pm1_0_cf = (b[4] << 8 | b[5]);
      d.pm2_5_cf = (b[6] << 8 | b[7]);
      d.pm10_cf = (b[8] << 8 | b[9]);
    } else if (rt === 0x02) {
      d.pm1_0 = (b[4] << 8 | b[5]);
      d.pm2_5 = (b[6] << 8 | b[7]);
      d.pm10 = (b[8] << 8 | b[9]);
    } else if (rt === 0x03) {
      d.pm0_3um = (b[4] << 16 | b[5] << 8 | b[6]);
      d.pm0_5um = (b[7] << 8 | b[8]);
      d.pm1_0um = (b[9] << 8 | b[10]);
    } else if (rt === 0x04) {
      d.pm2_5um = (b[4] << 8 | b[5]);
      d.pm5_0um = (b[6] << 8 | b[7]);
      d.pm10um = (b[8] << 8 | b[9]);
    } else if (rt === 0x05) {
      d.o3 = (b[4] << 8 | b[5]) * 0.1;
      d.co = (b[6] << 8 | b[7]) * 0.1;
      d.no = (b[8] << 8 | b[9]) * 0.1;
    } else if (rt === 0x06) {
      d.no2 = (b[4] << 8 | b[5]) * 0.1;
      d.so2 = (b[6] << 8 | b[7]);
      d.h2s = (b[8] << 8 | b[9]) * 0.1;
    } else if (rt === 0x07) {
      d.co2_concentration = (b[4] << 8 | b[5]) * 0.1;
      d.nh3 = (b[6] << 8 | b[7]) * 0.1;
      d.noise = (b[8] << 8 | b[9]) * 0.1;
    } else if (rt === 0x08) {
      d.ph = (b[4] << 8 | b[5]) * 0.01;
      d.temperature_with_ph = (b[6] << 8 | b[7]) * 0.01;
      d.orp = (b[8] << 8 | b[9]);
    } else if (rt === 0x09) {
      d.ntu = (b[4] << 8 | b[5]) * 0.1;
      d.temperature = (b[6] << 8 | b[7]) * 0.01;
      d.soil_vwc = (b[8] << 8 | b[9]) * 0.01;
    } else if (rt === 0x0A) {
      d.soil_humidity = (b[4] << 8 | b[5]) * 0.01;
      d.soil_temperature = (b[6] << 8 | b[7]) * 0.01;
      d.water_level = (b[8] << 8 | b[9]);
      d.soil_ec = b[10] * 0.1;
    } else if (rt === 0x0B) {
      d.temperature_with_ldo = (b[4] << 8 | b[5]) * 0.01;
      d.ldodo = (b[6] << 8 | b[7]) * 0.01;
      d.ldosat = (b[8] << 8 | b[9]) * 0.1;
    } else if (rt === 0x0C) {
      d.temperature = (b[4] << 8 | b[5]) * 0.01;
      d.humidity = (b[6] << 8 | b[7]) * 0.01;
      d.wind_speed = (b[8] << 8 | b[9]) * 0.01;
    } else if (rt === 0x0D) {
      d.wind_direction = (b[4] << 8 | b[5]);
      d.atmosphere = ((b[6] << 24) | (b[7] << 16) | (b[8] << 8) | b[9]) * 0.01;
    } else if (rt === 0x0E) {
      d.voc = (b[4] << 8 | b[5]) * 0.1;
    } else if (rt === 0x0F) {
      d.nitrogen = (b[4] << 8 | b[5]);
      d.phosphorus = (b[6] << 8 | b[7]);
      d.potassium = (b[8] << 8 | b[9]);
    } else if (rt === 0x10) {
      d.soil_humidity = (b[4] << 8 | b[5]) * 0.01;
      d.soil_temperature = (b[6] << 8 | b[7]) * 0.01;
      d.soil_ec = (b[8] << 8 | b[9]) * 0.001;
    } else if (rt === 0x11) {
      d.velocity = (b[4] << 8 | b[5]) * 0.1;
      d.displacement = (b[6] << 8 | b[7]) * 0.1;
      d.surface = (b[8] << 8 | b[9]) * 0.1;
    }
    return d;
  }
  if (fPort === 7) {
    d.cmd_id = b[0];
    return d;
  }
  return d;
}

function decodeUplink(input) {
  return {
    data: decode(input.bytes, input.fPort)
  };
}

function Decode(fPort, bytes) {
  return decode(bytes, fPort);
}

function Decoder(bytes, port) {
  return decode(bytes, port);
}
