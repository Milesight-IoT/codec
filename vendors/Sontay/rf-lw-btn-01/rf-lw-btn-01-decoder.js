// Source: Sontay RF-LW-BTN (LoRaWAN Multipurpose Programmable Button) user guide + MClimate Multipurpose Button LoRaWAN (MC-LW-BTN-01) communication protocol
// Sontay product page: https://www.sontay.com/en-gb/products/smart-devices/lorawan/rf-lw-btn-lorawan-multi-purpose-button/
// MClimate docs: https://docs.mclimate.eu/mclimate-lorawan-devices/devices/mclimate-multipurpose-button-lorawan/mclimate-button-lorawan-device-communication-protocol/keep-alive.md
// Uplinks: 01 keep-alive/press event, 12 get keep-alive period response, 1B get uplink type response, B1/B2/B3 press counters response
function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || !bytes.length) return out;
    var hex = '';
    for (var i = 0; i < bytes.length; i++) hex += ('0' + bytes[i].toString(16).toUpperCase()).slice(-2);
    out.raw_uplink = hex;
    var cmd = bytes[0];
    if (cmd === 0x01 && bytes.length >= 5) {
        out.battery_voltage = (bytes[1] * 8 + 1600) / 1000;
        out.thermistor_connected = ((bytes[2] >> 2) & 0x01) === 0 ? 1 : 0;
        var t = ((bytes[2] & 0x03) << 8) | bytes[3];
        out.temperature = t / 10;
        if (bytes[4] > 0) out.button_event = bytes[4];
    } else if (cmd === 0x12 && bytes.length >= 2) {
        out.keepalive_period = bytes[1];
    } else if (cmd === 0x1B && bytes.length >= 2) {
        out.uplink_confirmed = bytes[1] === 1 ? 1 : 0;
    } else if (cmd === 0xB1 && bytes.length >= 4) {
        out.single_press_count = (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
    } else if (cmd === 0xB2 && bytes.length >= 4) {
        out.double_press_count = (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
    } else if (cmd === 0xB3 && bytes.length >= 4) {
        out.triple_press_count = (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
