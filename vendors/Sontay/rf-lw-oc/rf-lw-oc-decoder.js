// Source: Sontay RF-LW-OC (LoRaWAN Open/Close Sensor) datasheet + MClimate Open/Close Sensor LoRaWAN (MC-LW-OC) communication protocol
// Sontay product page: https://www.sontay.com/en-gb/products/smart-devices/lorawan/rf-lw-oc-open-close-sensor-lorawan/
// MClimate docs: https://docs.mclimate.eu/mclimate-lorawan-devices/devices/mclimate-open-close-sensor-lorawan/open-close-sensor-lorawan-communication-protocol/keep-alive.md
// Uplinks: 8-byte keep-alive (byte0 = 01 keep-alive, 20 open/close event, 21 button push event), 12 keep-alive period response, 1B uplink type response
function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || !bytes.length) return out;
    var hex = '';
    for (var i = 0; i < bytes.length; i++) hex += ('0' + bytes[i].toString(16).toUpperCase()).slice(-2);
    out.raw_uplink = hex;
    var cmd = bytes[0];
    if ((cmd === 0x01 || cmd === 0x20 || cmd === 0x21) && bytes.length >= 8) {
        out.event_type = cmd;
        out.battery_voltage = (bytes[1] * 8 + 1600) / 1000;
        out.thermistor_connected = ((bytes[2] >> 2) & 0x01) === 0 ? 1 : 0;
        var t = ((bytes[2] & 0x03) << 8) | bytes[3];
        if ((bytes[2] >> 3) & 0x01) t = -t;
        out.temperature = t / 10;
        out.event_count = (bytes[4] << 16) | (bytes[5] << 8) | bytes[6];
        out.contact_open = (bytes[7] & 0x01) === 1 ? 1 : 0;
    } else if (cmd === 0x12 && bytes.length >= 2) {
        out.keepalive_period = bytes[1];
    } else if (cmd === 0x1B && bytes.length >= 2) {
        out.uplink_confirmed = bytes[1] === 1 ? 1 : 0;
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
