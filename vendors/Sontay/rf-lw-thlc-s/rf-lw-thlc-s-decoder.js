// Source: Sontay RF-LW-THLC-S LoRaWAN Solar Air Quality Sensor (CO2 NDIR, temperature, humidity, LUX)
// OEM: MClimate CO2 Display lite LoRaWAN (MC-LW-LITE-CO2-E-INK-01)
// Payload format (keep-alive, command 0x01):
// https://docs.mclimate.eu/mclimate-lorawan-devices/devices/mclimate-co2-display-lite/co2-display-lite-device-communication-protocol/keep-alive
function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || !bytes.length) return out;
    var hex = '';
    for (var i = 0; i < bytes.length; i++) hex += ('0' + bytes[i].toString(16).toUpperCase()).slice(-2);
    out.raw_uplink = hex;
    if (bytes[0] === 0x01 && bytes.length >= 10) {
        out.temperature = (((bytes[1] << 8) | bytes[2]) - 400) / 10;
        out.humidity = Math.round(bytes[3] * 100 / 256 * 10) / 10;
        out.battery_voltage = ((bytes[4] << 8) | bytes[5]) / 1000;
        out.co2 = ((bytes[7] & 0xF8) << 5) | bytes[6];
        out.power_source = bytes[7] & 0x07;
        out.light_intensity = (bytes[8] << 8) | bytes[9];
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
