function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || fPort !== 2 || bytes.length < 9) return out;
    var ext = bytes[6] & 0x0f;
    out.battery_voltage = (((bytes[0] << 8) | bytes[1]) & 0x3FFF) / 1000;
    out.battery_status = String(bytes[0] >> 6);
    if (ext !== 0x0f) {
        out.temperature = parseFloat(((((bytes[2] << 24) >> 16) | bytes[3]) / 100).toFixed(2));
        out.humidity = parseFloat((((((bytes[4] << 8) | bytes[5]) & 0x0fff)) / 10).toFixed(1));
    }
    if (ext === 1) {
        out.external_temperature = parseFloat(((((bytes[7] << 24) >> 16) | bytes[8]) / 100).toFixed(2));
    } else if (ext === 5) {
        out.illumination = (bytes[7] << 8) | bytes[8];
    } else if (ext === 6) {
        out.adc_value = ((bytes[7] << 8) | bytes[8]) / 1000;
    } else if (ext === 7) {
        out.exit_count = (bytes[7] << 8) | bytes[8];
    } else if (ext === 8 && bytes.length >= 11) {
        out.exit_count = ((bytes[7] << 24) | (bytes[8] << 16) | (bytes[9] << 8) | bytes[10]) >>> 0;
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
