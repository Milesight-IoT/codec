/**
 * Payload Decoder for Milesight Network Server
 *
 * Copyright 2023 Milesight IoT
 *
 * @product DS3604
 */
function Decode(fPort, bytes) {
    return milesight(bytes);
}

function milesight(bytes) {
    var decoded = {};

    for (var i = 0; i < bytes.length; ) {
        var channel_id = bytes[i++];
        var channel_type = bytes[i++];

        // IPSO VERSION
        if (channel_id === 0xff && channel_type === 0x01) {
            decoded.ipso_version = readProtocolVersion(bytes[i]);
            i += 1;
        }
        // HARDWARE VERSION
        else if (channel_id === 0xff && channel_type === 0x09) {
            decoded.hardware_version = readHardwareVersion(bytes.slice(i, i + 2));
            i += 2;
        }
        // FIRMWARE VERSION
        else if (channel_id === 0xff && channel_type === 0x0a) {
            decoded.firmware_version = readFirmwareVersion(bytes.slice(i, i + 2));
            i += 2;
        }
        // DEVICE STATUS
        else if (channel_id === 0xff && channel_type === 0x0b) {
            decoded.device_status = 1;
            i += 1;
        }
        // LORAWAN CLASS TYPE
        else if (channel_id === 0xff && channel_type === 0x0f) {
            decoded.lorawan_class = bytes[i];
            i += 1;
        }
        // SERIAL NUMBER
        else if (channel_id === 0xff && channel_type === 0x16) {
            decoded.sn = readSerialNumber(bytes.slice(i, i + 8));
            i += 8;
        }
        // BATTERY
        else if (channel_id === 0x01 && channel_type === 0x75) {
            decoded.battery = bytes[i];
            i += 1;
        }
        // TEMPLATE
        else if (channel_id == 0xff && channel_type == 0x73) {
            decoded.template = bytes[i] + 1;
            i += 1;
        }
        // TEMPLATE BLOCK CHANNEL DATA
        else if (channel_id == 0xfb && channel_type == 0x01) {
            var template_id = (bytes[i] >> 6) + 1;
            var block_id = bytes[i++] & 0x3f;
            var block_name;
            if (block_id < 10) {
                block_name = "text_" + (block_id + 1);
                block_length = bytes[i++];
                decoded[block_name] = fromUtf8Bytes(bytes.slice(i, i + block_length));
                i += block_length;
            } else if (block_id == 10) {
                block_name = "qrcode";
                block_length = bytes[i++];
                decoded[block_name] = fromUtf8Bytes(bytes.slice(i, i + block_length));
                i += block_length;
            }
            decoded.template = template_id;
        } else {
            break;
        }
    }

    return decoded;
}

function readProtocolVersion(bytes) {
    var major = (bytes & 0xf0) >> 4;
    var minor = bytes & 0x0f;
    return "v" + major + "." + minor;
}

function readHardwareVersion(bytes) {
    var major = bytes[0] & 0xff;
    var minor = (bytes[1] & 0xff) >> 4;
    return "v" + major + "." + minor;
}

function readFirmwareVersion(bytes) {
    var major = bytes[0] & 0xff;
    var minor = bytes[1] & 0xff;
    return "v" + major + "." + minor;
}

function readSerialNumber(bytes) {
    var temp = [];
    for (var idx = 0; idx < bytes.length; idx++) {
        temp.push(("0" + (bytes[idx] & 0xff).toString(16)).slice(-2));
    }
    return temp.join("");
}

function fromUtf8Bytes(bytes) {
    return decodeURIComponent(
        bytes
            .map(function (ch) {
                return "%" + (ch < 16 ? "0" : "") + ch.toString(16);
            })
            .join("")
    );
}
