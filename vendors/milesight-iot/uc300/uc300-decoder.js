/**
 * Payload Decoder for Milesight Network Server
 *
 * Copyright 2024 Milesight IoT
 *
 * @product UC300
 */
function Decode(fPort, bytes) {
    return milesight(bytes);
}

var gpio_in_chns = [0x03, 0x04, 0x05, 0x06];
var gpio_out_chns = [0x07, 0x08];
var pt100_chns = [0x09, 0x0a];
var ai_chns = [0x0b, 0x0c];
var av_chns = [0x0d, 0x0e];

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
        else if (channel_id === 0xff && channel_type === 0x16) {
            decoded.sn = readSerialNumber(bytes.slice(i, i + 8));
            i += 8;
        }
        // GPIO INPUT
        else if (includes(gpio_in_chns, channel_id) && channel_type === 0x00) {
            var id = channel_id - gpio_in_chns[0] + 1;
            var gpio_chn_name = "gpio_input_" + id;
            decoded[gpio_chn_name] = bytes[i];
            i += 1;
        }
        // GPIO OUTPUT
        else if (includes(gpio_out_chns, channel_id) && channel_type === 0x01) {
            var id = channel_id - gpio_out_chns[0] + 1;
            var gpio_chn_name = "gpio_output_" + id;
            decoded[gpio_chn_name] = bytes[i];
            i += 1;
        }
        // GPIO COUNTER
        else if (includes(gpio_in_chns, channel_id) && channel_type === 0xc8) {
            var id = channel_id - gpio_in_chns[0] + 1;
            var gpio_chn_name = "gpio_counter_" + id;
            decoded[gpio_chn_name] = readUInt32LE(bytes.slice(i, i + 4));
            i += 4;
        }
        // PT100
        else if (includes(pt100_chns, channel_id) && channel_type === 0x67) {
            var id = channel_id - pt100_chns[0] + 1;
            var pt100_chn_name = "pt100_" + id;
            decoded[pt100_chn_name] = readInt16LE(bytes.slice(i, i + 2)) / 10;
            i += 2;
        }
        // ANALOG CURRENT
        else if (includes(ai_chns, channel_id) && channel_type === 0x02) {
            var id = channel_id - ai_chns[0] + 1;
            var adc_chn_name = "adc_" + id;
            decoded[adc_chn_name] = readUInt32LE(bytes.slice(i, i + 4)) / 100;
            i += 4;
            continue;
        }
        // ANALOG VOLTAGE
        else if (includes(av_chns, channel_id) && channel_type === 0x02) {
            var id = channel_id - av_chns[0] + 1;
            var adv_chn_name = "adv_" + id;
            decoded[adv_chn_name] = readUInt32LE(bytes.slice(i, i + 4)) / 100;
            i += 4;
            continue;
        }
        // MODBUS
        else if (channel_id === 0xff && channel_type === 0x19) {
            var modbus_chn_id = bytes[i++] + 1;
            var data_length = bytes[i++];
            var data_type = bytes[i++];
            var sign = (data_type >>> 7) & 0x01;
            var type = data_type & 0x7f; // 0b01111111
            var modbus_chn_name = "modbus_chn_" + modbus_chn_id;
            switch (type) {
                case 0:
                    decoded[modbus_chn_name] = bytes[i];
                    i += 1;
                    break;
                case 1:
                    decoded[modbus_chn_name] = sign ? readInt8(bytes.slice(i, i + 1)) : readUInt8(bytes.slice(i, i + 1));
                    i += 1;
                    break;
                case 2:
                case 3:
                    decoded[modbus_chn_name] = sign ? readInt16LE(bytes.slice(i, i + 2)) : readUInt16LE(bytes.slice(i, i + 2));
                    i += 2;
                    break;
                case 4:
                case 6:
                    decoded[modbus_chn_name] = sign ? readInt32LE(bytes.slice(i, i + 4)) : readUInt32LE(bytes.slice(i, i + 4));
                    i += 4;
                    break;
                case 8:
                case 10:
                    decoded[modbus_chn_name] = sign ? readInt16LE(bytes.slice(i, i + 2)) : readUInt16LE(bytes.slice(i, i + 2));
                    i += 4;
                    break;
                case 9:
                case 11:
                    decoded[modbus_chn_name] = sign ? readInt16LE(bytes.slice(i + 2, i + 4)) : readUInt16LE(bytes.slice(i + 2, i + 4));
                    i += 4;
                    break;
                case 5:
                case 7:
                    decoded[modbus_chn_name] = readFloatLE(bytes.slice(i, i + 4));
                    i += 4;
                    break;
            }
        }
        // MODBUS READ ERROR
        else if (channel_id === 0xff && channel_type === 0x15) {
            var modbus_chn_id = bytes[i] + 1;
            var modbus_chn_name = "modbus_chn_" + modbus_chn_id + "_alarm";
            decoded[modbus_chn_name] = 1;
            i += 1;
        }
        // ANALOG CURRENT STATISTICS
        else if (includes(ai_chns, channel_id) && channel_type === 0xe2) {
            var id = channel_id - ai_chns[0] + 1;
            var adc_chn_name = "adc_" + id;
            decoded[adc_chn_name] = readFloat16LE(bytes.slice(i, i + 2));
            decoded[adc_chn_name + "_max"] = readFloat16LE(bytes.slice(i + 2, i + 4));
            decoded[adc_chn_name + "_min"] = readFloat16LE(bytes.slice(i + 4, i + 6));
            decoded[adc_chn_name + "_avg"] = readFloat16LE(bytes.slice(i + 6, i + 8));
            i += 8;
        }
        // ANALOG VOLTAGE STATISTICS
        else if (includes(av_chns, channel_id) && channel_type === 0xe2) {
            var id = channel_id - av_chns[0] + 1;
            var adv_chn_name = "adv_" + id;
            decoded[adv_chn_name] = readFloat16LE(bytes.slice(i, i + 2));
            decoded[adv_chn_name + "_max"] = readFloat16LE(bytes.slice(i + 2, i + 4));
            decoded[adv_chn_name + "_min"] = readFloat16LE(bytes.slice(i + 4, i + 6));
            decoded[adv_chn_name + "_avg"] = readFloat16LE(bytes.slice(i + 6, i + 8));
            i += 8;
        }
        // PT100 STATISTICS
        else if (includes(pt100_chns, channel_id) && channel_type === 0xe2) {
            var id = channel_id - pt100_chns[0] + 1;
            var pt100_chn_name = "pt100_" + id;
            decoded[pt100_chn_name] = readFloat16LE(bytes.slice(i, i + 2));
            decoded[pt100_chn_name + "_max"] = readFloat16LE(bytes.slice(i + 2, i + 4));
            decoded[pt100_chn_name + "_min"] = readFloat16LE(bytes.slice(i + 4, i + 6));
            decoded[pt100_chn_name + "_avg"] = readFloat16LE(bytes.slice(i + 6, i + 8));
            i += 8;
        }
        // HISTORY (CHANNEL)
        else if (channel_id === 0x20 && channel_type === 0xdc) {
            var timestamp = readUInt32LE(bytes.slice(i, i + 4));
            var channel_mask = numToBits(readUInt16LE(bytes.slice(i + 4, i + 6)), 16);
            i += 6;

            var data = { timestamp: timestamp };
            for (j = 0; j < channel_mask.length; j++) {
                // SKIP UNUSED CHANNELS
                if (channel_mask[j] !== 1) continue;

                // GPIO INPUT
                if (j < 4) {
                    var type = bytes[i++];
                    // AS GPIO INPUT
                    if (type === 0) {
                        var gpio_chn_name = "gpio_input_" + (j + 1);
                        data[gpio_chn_name] = readUInt32LE(bytes.slice(i, i + 4));
                        i += 4;
                    }
                    // AS COUNTER
                    else {
                        var gpio_chn_name = "gpio_counter_" + (j + 1);
                        data[gpio_chn_name] = readUInt32LE(bytes.slice(i, i + 4));
                        i += 4;
                    }
                }
                // GPIO OUTPUT
                else if (j < 6) {
                    var gpio_chn_name = "gpio_output_" + (j - 4 + 1);
                    data[gpio_chn_name] = bytes[i];
                    i += 1;
                }
                // PT100
                else if (j < 8) {
                    var pt100_chn_name = "pt100_" + (j - 6 + 1);
                    data[pt100_chn_name] = readFloat16LE(bytes.slice(i, i + 2));
                    i += 2;
                }
                // ADC
                else if (j < 10) {
                    var adv_chn_name = "adc_" + (j - 8 + 1);
                    data[adv_chn_name] = readFloat16LE(bytes.slice(i, i + 2));
                    data[adv_chn_name + "_max"] = readFloat16LE(bytes.slice(i + 2, i + 4));
                    data[adv_chn_name + "_min"] = readFloat16LE(bytes.slice(i + 4, i + 6));
                    data[adv_chn_name + "_avg"] = readFloat16LE(bytes.slice(i + 6, i + 8));
                    i += 8;
                }
                // ADV
                else if (j < 12) {
                    var adv_chn_name = "adv_" + (j - 10 + 1);
                    data[adv_chn_name] = readFloat16LE(bytes.slice(i, i + 2));
                    data[adv_chn_name + "_max"] = readFloat16LE(bytes.slice(i + 2, i + 4));
                    data[adv_chn_name + "_min"] = readFloat16LE(bytes.slice(i + 4, i + 6));
                    data[adv_chn_name + "_avg"] = readFloat16LE(bytes.slice(i + 6, i + 8));
                    i += 8;
                }
                // CUSTOM MESSAGE
                else if (j < 13) {
                    data.text = readAscii(bytes.slice(i, 48));
                    i += 48;
                }
            }

            decoded.history = decoded.history || [];
            decoded.history.push(data);
        }
        // HISTORY (MODBUS)
        else if (channel_id === 0x20 && channel_type === 0xdd) {
            var timestamp = readUInt32LE(bytes.slice(i, i + 4));
            var modbus_chn_mask = numToBits(readUInt32LE(bytes.slice(i + 4, i + 8)), 32);
            i += 8;

            var data = { timestamp: timestamp };
            for (j = 0; j < modbus_chn_mask.length; j++) {
                if (modbus_chn_mask[j] !== 1) continue;

                var modbus_chn_name = "modbus_chn_" + (j + 1);
                var data_type = bytes[i++];
                var sign = (data_type >>> 7) & 0x01;
                var type = data_type & 0x7f; // 0b01111111
                switch (type) {
                    case 0: // MB_COIL
                        decoded[modbus_chn_name] = bytes[i];
                        break;
                    case 1: // MB_DISCRETE
                        data[modbus_chn_name] = sign ? readInt8(bytes.slice(i, i + 1)) : readUInt8(bytes.slice(i, i + 1));
                        break;
                    case 2: // MB_INPUT_INT16
                    case 3: // MB_HOLDING_INT16
                        data[modbus_chn_name] = sign ? readInt16LE(bytes.slice(i, i + 2)) : readUInt16LE(bytes.slice(i, i + 2));
                        break;
                    case 4: // MB_HOLDING_INT32
                    case 6: // MB_INPUT_INT32
                        data[modbus_chn_name] = sign ? readInt32LE(bytes.slice(i, i + 4)) : readUInt32LE(bytes.slice(i, i + 4));
                        break;
                    case 8: // MB_INPUT_INT32_AB
                    case 10: // MB_HOLDING_INT32_AB
                        data[modbus_chn_name] = sign ? readInt16LE(bytes.slice(i, i + 2)) : readUInt16LE(bytes.slice(i, i + 2));
                        break;
                    case 9: // MB_INPUT_INT32_CD
                    case 11: // MB_HOLDING_INT32_CD
                        data[modbus_chn_name] = sign ? readInt16LE(bytes.slice(i + 2, i + 4)) : readUInt16LE(bytes.slice(i + 2, i + 4));
                        break;
                    case 5: // MB_HOLDING_FLOAT
                    case 7: // MB_INPUT_FLOAT
                        data[modbus_chn_name] = readFloatLE(bytes.slice(i, i + 4));
                        break;
                }
                i += 4;
            }

            decoded.history = decoded.history || [];
            decoded.history.push(data);
        }
        // DOWNLINK RESPONSE
        else if (channel_id === 0xfe) {
            result = handle_downlink_response(channel_type, bytes, i);
            decoded = Object.assign(decoded, result.data);
            i = result.offset;
        }
        // TEXT
        else {
            decoded.text = readAscii(bytes.slice(i - 2, bytes.length));
            i = bytes.length;
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

function readFloatLE(bytes) {
    // JavaScript bitwise operators yield a 32 bits integer, not a float.
    // Assume LSB (least significant byte first).
    var bits = (bytes[3] << 24) | (bytes[2] << 16) | (bytes[1] << 8) | bytes[0];
    var sign = bits >>> 31 === 0 ? 1.0 : -1.0;
    var e = (bits >>> 23) & 0xff;
    var m = e === 0 ? (bits & 0x7fffff) << 1 : (bits & 0x7fffff) | 0x800000;
    var f = sign * m * Math.pow(2, e - 150);

    var n = Number(f.toFixed(2));
    return n;
}

function readFloat16LE(bytes) {
    var bits = (bytes[1] << 8) | bytes[0];
    var sign = bits >>> 15 === 0 ? 1.0 : -1.0;
    var e = (bits >>> 10) & 0x1f;
    var m = e === 0 ? (bits & 0x3ff) << 1 : (bits & 0x3ff) | 0x400;
    var f = sign * m * Math.pow(2, e - 25);

    var n = Number(f.toFixed(2));
    return n;
}

function readAscii(bytes) {
    var str = "";
    for (var i = 0; i < bytes.length; i++) {
        str += String.fromCharCode(bytes[i]);
    }
    return str;
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

function handle_downlink_response(channel_type, bytes, offset) {
    var decoded = {};

    switch (channel_type) {
        case 0x4a: // sync_time
            decoded.sync_time = 1;
            offset += 1;
            break;
        case 0x03: // report_interval
            decoded.report_interval = readUInt16LE(bytes.slice(offset, offset + 2));
            offset += 2;
            break;
        case 0x02: // collection_interval
            decoded.collection_interval = readUInt16LE(bytes.slice(offset, offset + 2));
            offset += 2;
            break;
        case 0x17: // timezone
            decoded.timezone = readInt16LE(bytes.slice(offset, offset + 2)) / 10;
            offset += 2;
            break;
        case 0x11: // timestamp
            decoded.timestamp = readUInt32LE(bytes.slice(offset, offset + 4));
            offset += 4;
            break;
        case 0x91: // sniffer_config
            decoded.sniffer_config = decoded.sniffer_config || {};
            decoded.sniffer_config.channel_id = bytes[offset];
            decoded.sniffer_config.sniffer_interval = readUInt32LE(bytes.slice(offset + 1, offset + 5));
            offset += 5;
            break;
        case 0x93:
            var channel_id = bytes[offset];
            var channel_name = "gpio_output_" + channel_id;
            decoded[channel_name] = bytes[offset + 1];
            decoded[channel_name + "_time"] = readUInt32LE(bytes.slice(offset + 2, offset + 6));
            offset += 6;
            break;
        default:
            throw new Error("unknown downlink response");
    }

    return { data: decoded, offset: offset };
}

if (!Object.assign) {
    Object.defineProperty(Object, "assign", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (target) {
            "use strict";
            if (target == null) {
                // TypeError if undefined or null
                throw new TypeError("Cannot convert first argument to object");
            }

            var to = Object(target);
            for (var i = 1; i < arguments.length; i++) {
                var nextSource = arguments[i];
                if (nextSource == null) {
                    // Skip over if undefined or null
                    continue;
                }
                nextSource = Object(nextSource);

                var keysArray = Object.keys(Object(nextSource));
                for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
                    var nextKey = keysArray[nextIndex];
                    var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
                    if (desc !== undefined && desc.enumerable) {
                        to[nextKey] = nextSource[nextKey];
                    }
                }
            }
            return to;
        },
    });
}
