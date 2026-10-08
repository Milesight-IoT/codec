// Source: Browan Door & Window Sensor Reference Manual (TBDW100-915 / TBDW100-868),
//         DOC ver: BQW_02_0004.002, Section 4.1.2 "Payload" and Appendix "Configuration downlink Command".
// Uplink status message: port 100, 8 bytes:
//   byte 0      Status: 1 = open, 0 = closed
//   byte 1      Battery: bits [3:0] unsigned level 1-14, voltage V = (25 + level) / 10; bits [7:4] RFU
//   byte 2      Temp (PCB): bit 7 RFU; bits [6:0] unsigned 0-127, temp C = value - 32 (-32..95 C)
//   bytes 3-4   Time: unsigned minutes since last event-triggered message, little-endian
//   bytes 5-7   Count: unsigned total event-triggered count, little-endian, not persistent
// Downlink config response (port 204, only after unconfirmed Get downlink): 5 bytes,
//   bytes 0-2 echo the command (00 10 0E => keep-alive 0x0E10 = 3600 s), bytes 3-4 RFU check bytes.

function _hex(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i++) {
        out += ('0' + bytes[i].toString(16)).slice(-2);
    }
    return out.toUpperCase();
}

function _decode(bytes, fPort) {
    var out = {};
    if (!bytes || bytes.length === 0) return out;
    out.raw_uplink = _hex(bytes);
    if (fPort === 100 && bytes.length >= 8) {
        out.door_window_status = bytes[0] & 0x01;
        var level = bytes[1] & 0x0F; // Battery: byte1 bits [3:0]; bits [7:4] RFU
        out.battery_level = level;
        out.battery_voltage = (25 + level) / 10;
        out.temperature = (bytes[2] & 0x7F) - 32;
        out.time_since_last_event = bytes[3] | (bytes[4] << 8);
        out.event_count = (bytes[5] | (bytes[6] << 8) | (bytes[7] << 16)) >>> 0;
    } else if (fPort === 204 && bytes.length >= 3) {
        out.keep_alive_interval = bytes[1] | (bytes[2] << 8);
    }
    return out;
}

function decodeUplink(input) {
    return { data: _decode(input.bytes, input.fPort) };
}

function Decode(fPort, bytes) {
    return _decode(bytes, fPort);
}

function Decoder(bytes, port) {
    return _decode(bytes, port);
}
