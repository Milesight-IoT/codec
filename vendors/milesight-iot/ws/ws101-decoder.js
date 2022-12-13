/**
 * Payload Decoder for Chirpstack and Milesight network server
 *
 * Copyright 2022 Milesight IoT
 *
 * @product WS101
 * @params
 *     - fPort: 85
 *     - bytes: [0x01, 0x75, 0x64]
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
        // BUTTON PRESS STATE
        else if (channel_id === 0xff && channel_type === 0x2e) {
            var ts = new Date().getTime();
            decoded.button = bytes[i];
            switch (decoded.button) {
                case 1:
                    decoded.button_single_msgid = ts;
                    break;
                case 2:
                    decoded.button_long_msgid = ts;
                    break;
                case 3:
                    decoded.button_double_msgid = ts;
                    break;
            }
            i += 1;
        } else {
            break;
        }
    }

    return decoded;
}