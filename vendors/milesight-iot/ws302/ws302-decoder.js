/**
 * Payload Decoder for Milesight Network Server
 *
 * Copyright 2023 Milesight IoT
 *
 * @product WS302
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
        // SOUND
        else if (channel_id === 0x05 && channel_type === 0x5b) {
            decoded.freq_weight = bytes[i] & 0x03;
            decoded.time_weight = (bytes[i] >> 2) & 0x03;
            decoded.la = readUInt16LE(bytes.slice(i + 1, i + 3)) / 10;
            decoded.laeq = readUInt16LE(bytes.slice(i + 3, i + 5)) / 10;
            decoded.lafmax = readUInt16LE(bytes.slice(i + 5, i + 7)) / 10;
            i += 7;
        }
        // LoRaWAN Class Type
        else if (channel_id === 0xff && channel_type === 0x0f) {
            decoded.class_type = bytes[i];
            i += 1;
        } else {
            break;
        }
    }

    return decoded;
}

function readUInt16LE(bytes) {
    var value = (bytes[1] << 8) + bytes[0];
    return value & 0xffff;
}

function readInt16LE(bytes) {
    var ref = readUInt16LE(bytes);
    return ref > 0x7fff ? ref - 0x10000 : ref;
}