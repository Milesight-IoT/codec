/**
 * Payload Decoder for Milesight Network Server
 *
 * Copyright 2023 Milesight IoT
 *
 * @product WS301
 */
function Decode(fPort, bytes) {
    var decoded = {};

    for (var i = 0; i < bytes.length;) {
        var channel_id = bytes[i++];
        var channel_type = bytes[i++];
        // BATTERY
        if (channel_id === 0x01 && channel_type === 0x75) {
            decoded.battery = bytes[i];
            i += 1;
        }
        // MAGNET STATUS (0: Close 1: Open)
        else if (channel_id === 0x03 && channel_type === 0x00) {
            decoded.magnet_status = bytes[i];
            i += 1;
        }
        // TAMPER STATUS (0: Install 1: Removed)
        else if (channel_id === 0x04 && channel_type === 0x00) {
            decoded.tamper_status = bytes[i];
            i += 1;
        } else {
            break;
        }
    }

    return decoded;
}