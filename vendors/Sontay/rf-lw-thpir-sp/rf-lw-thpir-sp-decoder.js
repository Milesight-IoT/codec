// Source: Sontay RF-LW-THPIR-SP LoRaWAN Wireless Thermostat (solar powered, PIR, temperature, humidity, LUX)
// OEM: MClimate Wireless Thermostat LoRaWAN (MC-LW-WT-01)
// Payload format (keep-alive): f.w. >= 1.4 uses command 0x81 (12 bytes),
// f.w. <= 1.3 uses command 0x01 (11 bytes, target temperature 1 byte integer).
// https://docs.mclimate.eu/mclimate-lorawan-devices/devices/mclimate-wireless-thermostat/wireless-thermostat-device-communication-protocol/keep-alive
function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || !bytes.length) return out;
    var hex = '';
    for (var i = 0; i < bytes.length; i++) hex += ('0' + bytes[i].toString(16).toUpperCase()).slice(-2);
    out.raw_uplink = hex;
    if (bytes[0] === 0x81 && bytes.length >= 12) {
        out.temperature = (((bytes[1] << 8) | bytes[2]) - 400) / 10;
        out.humidity = Math.round(bytes[3] * 100 / 256 * 10) / 10;
        out.battery_voltage = ((bytes[4] << 8) | bytes[5]) / 1000;
        out.target_temperature = ((bytes[6] << 8) | bytes[7]) / 10;
        out.power_source = bytes[8];
        out.light_intensity = (bytes[9] << 8) | bytes[10];
        out.pir_status = bytes[11] === 0x01 ? 1 : 0;
    } else if (bytes[0] === 0x01 && bytes.length >= 11) {
        out.temperature = (((bytes[1] << 8) | bytes[2]) - 400) / 10;
        out.humidity = Math.round(bytes[3] * 100 / 256 * 10) / 10;
        out.battery_voltage = ((bytes[4] << 8) | bytes[5]) / 1000;
        out.target_temperature = bytes[6];
        out.power_source = bytes[7];
        out.light_intensity = (bytes[8] << 8) | bytes[9];
        out.pir_status = bytes[10] === 0x01 ? 1 : 0;
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
