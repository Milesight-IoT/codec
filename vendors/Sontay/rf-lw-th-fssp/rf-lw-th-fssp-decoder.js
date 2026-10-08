// Source: Sontay RF-LW-TH-FSSP LoRaWAN Fan Coil Thermostat (2/4-pipe FCU, 3-speed or ECM fan)
// OEM: MClimate Fan Coil Thermostat LoRaWAN (FCT, MC-LW-FCT-01)
// Payload format (keep-alive, command 0x01):
// https://docs.mclimate.eu/mclimate-lorawan-devices/devices/mclimate-fan-coil-thermostat-fct/mclimate-fan-coil-thermostat-device-communication-protocol/keep-alive
function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || !bytes.length) return out;
    var hex = '';
    for (var i = 0; i < bytes.length; i++) hex += ('0' + bytes[i].toString(16).toUpperCase()).slice(-2);
    out.raw_uplink = hex;
    if (bytes[0] === 0x01 && bytes.length >= 11) {
        out.temperature = (((bytes[1] << 8) | bytes[2]) - 400) / 10;
        out.humidity = Math.round(bytes[3] * 100 / 256 * 10) / 10;
        out.target_temperature = ((bytes[4] << 8) | bytes[5]) / 10;
        out.operation_mode = bytes[6];
        out.displayed_fan_speed = bytes[7];
        out.actual_fan_speed = bytes[8];
        out.valve_status = bytes[9] === 0x01 ? 1 : 0;
        out.device_status = bytes[10] === 0x01 ? 1 : 0;
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
