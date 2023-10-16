/**
 * Payload Decoder for Milesight Network Server
 *
 * Copyright 2023 Milesight IoT
 *
 * @product GS101
 */
function Decode(fPort, bytes) {
    return milesight(bytes);
}

function milesight(bytes) {
    var decoded = {};

    for (var i = 0; i < bytes.length; ) {
        var channel_id = bytes[i++];
        var channel_type = bytes[i++];

        // GAS STATUS
        if (channel_id === 0x05 && channel_type === 0x8e) {
            decoded.gas_status = bytes[i];
            i += 1;
        }
        // VALVE STATUS
        else if (channel_id === 0x06 && channel_type === 0x01) {
            decoded.valve_status = bytes[i];
            i += 1;
        }
        // relay
        else if (channel_id === 0x07 && channel_type === 0x01) {
            decoded.relay = bytes[i];
            i += 1;
        }
        // REMAIN TIME
        else if (channel_id === 0x08 && channel_type === 0x90) {
            decoded.remain_time = readUInt32LE(bytes.slice(i, i + 4));
            i += 4;
        }
        // ALARM
        else if (channel_id === 0xff && channel_type === 0x3f) {
            decoded.alarm = bytes[i];
            i += 1;
        } else {
            break;
        }
    }

    return decoded;
}

/* ******************************************
 * bytes to number
 ********************************************/
function readUInt32LE(bytes) {
    var value = (bytes[3] << 24) + (bytes[2] << 16) + (bytes[1] << 8) + bytes[0];
    return (value & 0xffffffff) >>> 0;
}
