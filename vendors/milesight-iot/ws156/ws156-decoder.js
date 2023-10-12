/**
 * Payload Decoder for Milesight Network Server
 *
 * Copyright 2023 Milesight IoT
 *
 * @product WS156
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
        else if (channel_id === 0xff && channel_type === 0x34) {
            var id = bytes[i];
            var channel_name = "button_" + id;
            var channel_name_msgid = "button_" + id + "_msgid";
            var msg_id = getRandomIntInclusive(100000, 999999);
            decoded[channel_name] = 1;
            decoded[channel_name_msgid] = msg_id;
            i += 3;
        } else {
            break;
        }
    }

    return decoded;
}

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}