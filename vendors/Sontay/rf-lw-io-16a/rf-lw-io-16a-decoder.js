// Source: Sontay RF-LW-IO-16A LoRaWAN Switch and Power Meter
// OEM: MClimate 16A Switch & Power Meter LoRaWAN (16ASPM, MC-LW-16ASPM-01)
// Payload format (keep-alive, command 0x01, FW >= 1.3):
// https://docs.mclimate.eu/mclimate-lorawan-devices/devices/mclimate-16a-switch-and-power-meter-lorawan-16aspm/mclimate-16aspm-device-communication-protocol/keep-alive
function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || !bytes.length) return out;
    var hex = '';
    for (var i = 0; i < bytes.length; i++) hex += ('0' + bytes[i].toString(16).toUpperCase()).slice(-2);
    out.raw_uplink = hex;
    if (bytes[0] === 0x01 && bytes.length >= 12) {
        var t = bytes[1] & 0x7F;
        if (bytes[1] & 0x80) t = -t;
        out.temperature = t;
        out.energy = (((bytes[2] << 24) | (bytes[3] << 16) | (bytes[4] << 8) | bytes[5]) >>> 0) / 1000;
        out.power = (bytes[6] << 8) | bytes[7];
        out.voltage = bytes[8];
        out.current = (bytes[9] << 8) | bytes[10];
        out.relay_state = bytes[11] === 0x01 ? 1 : 0;
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
