// Source: Browan TBWL100 Water Leak Sensor Reference Manual (DOC ver. BQW_02_0012.002)
//        Section 4 "Messages" (Port 106 status payload) and Appendix
//        "Configuration Downlink Command" (Port 204 command/response, frame count 0 content)
function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || bytes.length === 0) return out;
    var hex = [];
    for (var i = 0; i < bytes.length; i++) hex.push(('0' + bytes[i].toString(16)).slice(-2).toUpperCase());
    out.raw_uplink = hex.join('');

    if (bytes.length === 5) {
        // Status message, port 106: Status, Battery, Temp (PCB), RH, Temp (Environment)
        var status = bytes[0];
        out.water_leak_detected = (status & 0x01) !== 0; // bit0: 1 = leakage detected, 0 = dry
        out.water_leak_interrupt = (status & 0x10) !== 0; // bit4
        out.temperature_changed = (status & 0x20) !== 0; // bit5: +/-2 degC delta
        out.humidity_changed = (status & 0x40) !== 0; // bit6: +/-5 %RH delta
        out.battery_voltage = (25 + (bytes[1] & 0x0f)) / 10;
        out.temperature_pcb = (bytes[2] & 0x7f) - 32;
        var rh = bytes[3] & 0x7f;
        out.humidity = (rh === 127) ? null : rh; // 127 = measurement error
        out.temperature_environment = (bytes[4] & 0x7f) - 32;
    } else if (bytes.length === 10 && bytes[0] === 0x00 && bytes[3] === 0x01 && bytes[5] === 0x02 && bytes[7] === 0x03) {
        // Port 204 response to "Get Sensor Configuration": 00 <keep-alive LE16> 01 <temp delta> 02 <rh delta> 03 <detection LE16>
        out.keep_alive_interval = (bytes[2] << 8) | bytes[1];
        out.temperature_delta = bytes[4];
        out.rh_delta = bytes[6];
        out.detection_interval = (bytes[9] << 8) | bytes[8];
    } else if (bytes.length === 17 && bytes[0] === 0x01) {
        // Frame count 0 content: cmd 01, bootloader version LE32, HW ID LE32, FW CRC LE32, PubKey ID LE32
        out.bootloader_version = ((bytes[4] << 24) | (bytes[3] << 16) | (bytes[2] << 8) | bytes[1]) >>> 0;
        out.hardware_id = ((bytes[8] << 24) | (bytes[7] << 16) | (bytes[6] << 8) | bytes[5]) >>> 0;
        var crc = ((bytes[12] << 24) | (bytes[11] << 16) | (bytes[10] << 8) | bytes[9]) >>> 0;
        var key = ((bytes[16] << 24) | (bytes[15] << 16) | (bytes[14] << 8) | bytes[13]) >>> 0;
        out.firmware_crc = ('00000000' + crc.toString(16).toUpperCase()).slice(-8);
        out.public_key_id = ('00000000' + key.toString(16).toUpperCase()).slice(-8);
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes, input.fPort) }; }
function Decode(fPort, bytes) { return _decode(bytes, fPort); }
function Decoder(bytes, port) { return _decode(bytes, port); }
