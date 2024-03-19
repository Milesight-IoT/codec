/**
 * Payload Decoder for Milesight Network Server
 *
 * Copyright 2024 Milesight IoT
 *
 * @product AT101
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
            decoded.battery = readUInt8(bytes[i]);
            i += 1;
        }
        // TEMPERATURE
        else if (channel_id === 0x03 && channel_type === 0x67) {
            decoded.temperature = readInt16LE(bytes.slice(i, i + 2)) / 10;
            i += 2;
        }
        // LOCATION
        else if ((channel_id === 0x04 || channel_id == 0x84) && channel_type === 0x88) {
            decoded.latitude = readInt32LE(bytes.slice(i, i + 4)) / 1000000;
            decoded.longitude = readInt32LE(bytes.slice(i + 4, i + 8)) / 1000000;
            var status = bytes[i + 8];
            decoded.motion_status = status & 0x0f;
            decoded.geofence_status = status >> 4;
            i += 9;
        }
        // POSITION
        else if (channel_id === 0x05 && channel_type === 0x00) {
            decoded.position = bytes[i];
            i += 1;
        }
        // WI-FI SCAN RESULT
        else if (channel_id === 0x06 && channel_type === 0xd9) {
            var wifi = {};
            wifi.group = readUInt8(bytes[i]);
            wifi.mac = readMAC(bytes.slice(i + 1, i + 7));
            wifi.rssi = readInt8(bytes[i + 7]);
            var status = bytes[i + 8];
            wifi.motion_status = status & 0x0f;
            i += 9;

            decoded.wifi_scan_result = 0x00;
            if (wifi.mac === "ff:ff:ff:ff:ff:ff") {
                decoded.wifi_scan_result = 0x01;
                continue;
            }
            decoded.motion_status = wifi.motion_status;

            decoded.wifi = decoded.wifi || [];
            decoded.wifi.push(wifi);
        }
        // TAMPER STATUS
        else if (channel_id === 0x07 && channel_type === 0x00) {
            decoded.tamper_status = bytes[i];
            i += 1;
        }
        // TEMPERATURE ABNORMAL
        else if (channel_id === 0x83 && channel_type === 0x67) {
            decoded.temperature = readInt16LE(bytes.slice(i, i + 2)) / 10;
            decoded.temperature_abnormal = bytes[i + 2];
            i += 3;
        }
        // HISTORY
        else if (channel_id === 0x20 && channel_type === 0xce) {
            var data = {};
            data.timestamp = readUInt32LE(bytes.slice(i, i + 4));
            data.longitude = readInt32LE(bytes.slice(i + 4, i + 8)) / 1000000;
            data.latitude = readInt32LE(bytes.slice(i + 8, i + 12)) / 1000000;
            i += 12;

            decoded.history = decoded.history || [];
            decoded.history.push(data);
        } else {
            break;
        }
    }
    return decoded;
}

function readUInt8(bytes) {
    return bytes & 0xff;
}

function readInt8(bytes) {
    var ref = readUInt8(bytes);
    return ref > 0x7f ? ref - 0x100 : ref;
}

function readUInt16LE(bytes) {
    var value = (bytes[1] << 8) + bytes[0];
    return value & 0xffff;
}

function readInt16LE(bytes) {
    var ref = readUInt16LE(bytes);
    return ref > 0x7fff ? ref - 0x10000 : ref;
}

function readUInt32LE(bytes) {
    var value = (bytes[3] << 24) + (bytes[2] << 16) + (bytes[1] << 8) + bytes[0];
    return (value & 0xffffffff) >>> 0;
}

function readInt32LE(bytes) {
    var ref = readUInt32LE(bytes);
    return ref > 0x7fffffff ? ref - 0x100000000 : ref;
}

function readMAC(bytes) {
    var temp = [];
    for (var idx = 0; idx < bytes.length; idx++) {
        temp.push(("0" + (bytes[idx] & 0xff).toString(16)).slice(-2));
    }
    return temp.join(":");
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
