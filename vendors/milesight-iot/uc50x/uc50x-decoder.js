/**
 * Payload Decoder for Milesight Network Server
 *
 * Copyright 2023 Milesight IoT
 *
 * @product UC50x
 */
function Decode(fPort, bytes) {
    return milesight(bytes);
}

gpio_chns = [0x03, 0x04];
adc_chns = [0x05, 0x06];
adc_alarm_chns = [0x85, 0x86];

function milesight(bytes) {
    var decoded = {};

    for (i = 0; i < bytes.length; ) {
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
        else if (channel_id === 0xff && channel_type === 0x08) {
            decoded.sn = readSerialNumber(bytes.slice(i, i + 6));
            i += 6;
        }
        // BATTERY
        else if (channel_id === 0x01 && channel_type === 0x75) {
            decoded.battery = bytes[i];
            i += 1;
        }
        // GPIO INPUT
        else if (includes(gpio_chns, channel_id) && channel_type === 0x00) {
            var gpio_chn_name = "gpio_input_" + (channel_id - gpio_chns[0] + 1);
            decoded[gpio_chn_name] = bytes[i];
            i += 1;
        }
        // GPIO OUTPUT
        else if (includes(gpio_chns, channel_id) && channel_type === 0x01) {
            var gpio_chn_name = "gpio_output_" + (channel_id - gpio_chns[0] + 1);
            decoded[gpio_chn_name] = bytes[i];
            i += 1;
        }
        //  GPIO COUNTER
        else if (includes(gpio_chns, channel_id) && channel_type === 0xc8) {
            var gpio_chn_name = "gpio_counter_" + (channel_id - gpio_chns[0] + 1);
            decoded[gpio_chn_name] = readUInt32LE(bytes.slice(i, i + 4));
            i += 4;
        }
        // ADC (UC50x v2)
        // firmware version 1.10 and below and UC50x V1, change 1000 to 100.
        else if (includes(adc_chns, channel_id) && channel_type === 0x02) {
            var adc_chn_name = "adc_" + (channel_id - adc_chns[0] + 1);
            decoded[adc_chn_name] = readInt16LE(bytes.slice(i, i + 2)) / 1000;
            decoded[adc_chn_name + "_min"] = readInt16LE(bytes.slice(i + 2, i + 4)) / 1000;
            decoded[adc_chn_name + "_max"] = readInt16LE(bytes.slice(i + 4, i + 6)) / 1000;
            decoded[adc_chn_name + "_avg"] = readInt16LE(bytes.slice(i + 6, i + 8)) / 1000;
            i += 8;
        }
        // ADC (UC50x v3)
        else if (includes(adc_chns, channel_id) && channel_type === 0xe2) {
            var adc_chn_name = "adc_" + (channel_id - adc_chns[0] + 1);
            decoded[adc_chn_name] = readFloat16LE(bytes.slice(i, i + 2));
            decoded[adc_chn_name + "_min"] = readFloat16LE(bytes.slice(i + 2, i + 4));
            decoded[adc_chn_name + "_max"] = readFloat16LE(bytes.slice(i + 4, i + 6));
            decoded[adc_chn_name + "_avg"] = readFloat16LE(bytes.slice(i + 6, i + 8));
            i += 8;
        }
        // SDI-12
        else if (channel_id === 0x08 && channel_type === 0xdb) {
            var sdi12_chn_name = "sdi12_" + (bytes[i++] + 1);
            decoded[sdi12_chn_name] = readString(bytes.slice(i, i + 36));
            i += 36;
        }
        // MODBUS
        else if ((channel_id === 0xff || channel_id === 0x80) && channel_type === 0x0e) {
            var modbus_chn_id = bytes[i++] - 6;
            var package_type = bytes[i++];
            var data_type = package_type & 0x07; // 0x07 = 0b00000111
            var date_length = package_type >> 3;
            var modbus_chn_name = "modbus_chn_" + modbus_chn_id;
            switch (data_type) {
                case 0:
                    decoded[modbus_chn_name] = bytes[i];
                    i += 1;
                    break;
                case 1:
                    decoded[modbus_chn_name] = bytes[i];
                    i += 1;
                    break;
                case 2:
                case 3:
                    decoded[modbus_chn_name] = readUInt16LE(bytes.slice(i, i + 2));
                    i += 2;
                    break;
                case 4:
                case 6:
                    decoded[modbus_chn_name] = readUInt32LE(bytes.slice(i, i + 4));
                    i += 4;
                    break;
                case 5:
                case 7:
                    decoded[modbus_chn_name] = readFloatLE(bytes.slice(i, i + 4));
                    i += 4;
                    break;
            }

            if (channel_id === 0x80) {
                decoded[modbus_chn_name + "_alarm"] = bytes[i++];
            }
        }
        // MODBUS READ ERROR
        else if (channel_id === 0xff && channel_type === 0x15) {
            var modbus_error_chn_id = bytes[i] - 6;
            var modbus_chn_name = "modbus_chn_" + modbus_error_chn_id + "_alarm";
            decoded[modbus_chn_name] = 1;
            i += 1;
        }
        // ADC ALARM (UC50x v3)
        else if (includes(adc_alarm_chns, channel_id) && channel_type === 0xe2) {
            var adc_chn_name = "adc_" + (channel_id - adc_alarm_chns[0] + 1);
            decoded[adc_chn_name] = readFloat16LE(bytes.slice(i, i + 2));
            decoded[adc_chn_name + "_min"] = readFloat16LE(bytes.slice(i + 2, i + 4));
            decoded[adc_chn_name + "_max"] = readFloat16LE(bytes.slice(i + 4, i + 6));
            decoded[adc_chn_name + "_avg"] = readFloat16LE(bytes.slice(i + 6, i + 8));
            decoded[adc_chn_name + "_alarm"] = bytes[i + 8];
            i += 9;
        }
        // HISTORY (GPIO / ADC)
        else if (channel_id === 0x20 && channel_type === 0xdc) {
            var data = {};
            data.timestamp = readUInt32LE(bytes.slice(i, i + 4));
            data.gpio_1_type = bytes[i + 4];
            data.gpio_1 = readUInt32LE(bytes.slice(i + 5, i + 9));
            data.gpio_2_type = bytes[i + 9];
            data.gpio_2 = readUInt32LE(bytes.slice(i + 10, i + 14));
            data.adc_1 = readInt32LE(bytes.slice(i + 14, i + 18)) / 1000;
            data.adc_2 = readInt32LE(bytes.slice(i + 18, i + 22)) / 1000;
            i += 22;

            decoded.history = decoded.history || [];
            decoded.history.push(data);
        }
        // HISTORY (SDI-12)
        else if (channel_id === 0x20 && channel_type === 0xe0) {
            var timestamp = readUInt32LE(bytes.slice(i, i + 4));
            var channel_mask = numToBits(readUInt16LE(bytes.slice(i + 4, i + 6)), 16);
            i += 6;

            var data = { timestamp: timestamp };
            for (j = 0; j < channel_mask.length; j++) {
                // skip if channel is not enabled
                if (channel_mask[j] === 0) continue;
                var sdi12_chn_name = "sdi12_" + (j + 1);
                data[sdi12_chn_name] = readString(bytes.slice(i, i + 36));
                i += 36;
            }

            decoded.history = decoded.history || [];
            decoded.history.push(data);
        }
        // HISTORY (MODBUS)
        else if (channel_id === 0x20 && channel_type === 0xdd) {
            var timestamp = readUInt32LE(bytes.slice(i, i + 4));
            var channel_mask = numToBits(readUInt16LE(bytes.slice(i + 4, i + 6)), 16);
            i += 6;

            var data = { timestamp: timestamp };
            for (j = 0; j < channel_mask.length; j++) {
                // skip if channel is not enabled
                if (channel_mask[j] === 0) continue;

                var modbus_chn_name = "modbus_chn_" + (j + 1);
                var type = bytes[i++] & 0x07; // 0x07 = 0b00000111
                // 5 MB_REG_HOLD_FLOAT, 7 MB_REG_INPUT_FLOAT
                if (type === 5 || type === 7) {
                    data[modbus_chn_name] = readFloatLE(bytes.slice(i, i + 4));
                } else {
                    data[modbus_chn_name] = readUInt32LE(bytes.slice(i, i + 4));
                }
                i += 4;
            }

            decoded.history = decoded.history || [];
            decoded.history.push(data);
        } else {
            break;
        }
    }

    return decoded;
}

function numToBits(num, bit_count) {
    var bits = [];
    for (var i = 0; i < bit_count; i++) {
        bits.push((num >> i) & 1);
    }
    return bits;
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

function readFloat16LE(bytes) {
    var bits = (bytes[1] << 8) | bytes[0];
    var sign = bits >>> 15 === 0 ? 1.0 : -1.0;
    var e = (bits >>> 10) & 0x1f;
    var m = e === 0 ? (bits & 0x3ff) << 1 : (bits & 0x3ff) | 0x400;
    var f = sign * m * Math.pow(2, e - 25);
    return f;
}

function readFloatLE(bytes) {
    var bits = (bytes[3] << 24) | (bytes[2] << 16) | (bytes[1] << 8) | bytes[0];
    var sign = bits >>> 31 === 0 ? 1.0 : -1.0;
    var e = (bits >>> 23) & 0xff;
    var m = e === 0 ? (bits & 0x7fffff) << 1 : (bits & 0x7fffff) | 0x800000;
    var f = sign * m * Math.pow(2, e - 150);
    return f;
}

function includes(datas, value) {
    var size = datas.length;
    for (var i = 0; i < size; i++) {
        if (datas[i] == value) {
            return true;
        }
    }
    return false;
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

function readString(bytes) {
    var str = "";
    for (var i = 0; i < bytes.length; i++) {
        if (bytes[i] === 0) {
            break;
        }
        str += String.fromCharCode(bytes[i]);
    }
    return str;
}

function readGPIOType(type) {
    switch (type) {
        case 0:
            return "GPIO Input";
        case 1:
            return "GPIO Output";
        case 2:
            return "GPIO Counter";
        default:
            return "Unknown";
    }
}
