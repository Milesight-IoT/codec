/**
 * Payload Decoder for Milesight Network Server
 *
 * Copyright 2024 Milesight IoT
 *
 * @product WT101
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
        // TEMPERATURE
        else if (channel_id === 0x03 && channel_type === 0x67) {
            decoded.temperature = readInt16LE(bytes.slice(i, i + 2)) / 10;
            i += 2;
        }
        // TEMPERATURE TARGET
        else if (channel_id === 0x04 && channel_type === 0x67) {
            decoded.temperature_target = readInt16LE(bytes.slice(i, i + 2)) / 10;
            i += 2;
        }
        // VALVE OPENING
        else if (channel_id === 0x05 && channel_type === 0x92) {
            decoded.valve_opening = readUInt8(bytes[i]);
            i += 1;
        }
        // TAMPER STATUS
        else if (channel_id === 0x06 && channel_type === 0x00) {
            decoded.tamper_status = bytes[i];
            i += 1;
        }
        // WINDOW DETECTION
        else if (channel_id === 0x07 && channel_type === 0x00) {
            decoded.window_detection = bytes[i];
            i += 1;
        }
        // MOTOR STROKE CALIBRATION RESULT
        else if (channel_id === 0x08 && channel_type === 0xe5) {
            decoded.motor_calibration_result = bytes[i];
            i += 1;
        }
        // MOTOR STROKE
        else if (channel_id === 0x09 && channel_type === 0x90) {
            decoded.motor_stroke = readUInt16LE(bytes.slice(i, i + 2));
            i += 2;
        }
        // FREEZE PROTECTION
        else if (channel_id === 0x0a && channel_type === 0x00) {
            decoded.freeze_protection = bytes[i];
            i += 1;
        }
        // MOTOR CURRENT POSITION
        else if (channel_id === 0x0b && channel_type === 0x90) {
            decoded.motor_position = readUInt16LE(bytes.slice(i, i + 2));
            i += 2;
        }
        // DOWNLINK RESPONSE
        else if (channel_id === 0xfe) {
            result = handle_downlink_response(channel_type, bytes, i);
            decoded = Object.assign(decoded, result.data);
            i = result.offset;
        }
        // DOWNLINK RESPONSE
        else if (channel_id === 0xfe) {
            result = handle_downlink_response(channel_type, bytes, i);
            decoded = Object.assign(decoded, result.data);
            i = result.offset;
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
function readMotorCalibration(type) {
    switch (type) {
        case 0x00:
            return "success";
        case 0x01:
            return "fail: out of range";
        case 0x02:
            return "fail: uninstalled";
        case 0x03:
            return "calibration cleared";
        case 0x04:
            return "temperature control disabled";
        default:
            return "unknown";
    }
}

function handle_downlink_response(channel_type, bytes, offset) {
    var decoded = {};

    switch (channel_type) {
        case 0x17: // timezone
            decoded.timezone = readInt16LE(bytes.slice(offset, offset + 2)) / 10;
            offset += 2;
            break;
        case 0x4a: // sync_time
            decoded.sync_time = 1;
            offset += 1;
            break;
        case 0x8e: // report_interval
            // ignore the first byte
            decoded.report_interval = readUInt16LE(bytes.slice(offset + 1, offset + 3));
            offset += 3;
            break;
        case 0x3b: // time_sync_enable
            decoded.time_sync_enable = readUInt8(bytes[offset]);
            offset += 1;
            break;
        case 0xb3: // temperature_control(enable)
            decoded.temperature_control = decoded.temperature_control || {};
            decoded.temperature_control.enable = bytes[offset];
            offset += 1;
            break;
        case 0xae: // temperature_control(mode)
            decoded.temperature_control = decoded.temperature_control || {};
            decoded.temperature_control.mode = bytes[offset];
            offset += 1;
            break;
        case 0xab: // temperature_calibration(enable, temperature)
            decoded.temperature_calibration = {};
            decoded.temperature_calibration.enable = bytes[offset];
            decoded.temperature_calibration.temperature = readInt16LE(bytes.slice(offset + 1, offset + 3)) / 10;
            offset += 3;
            break;
        case 0xb1: // temperature_target, temperature_error
            decoded.temperature_target = readInt8(bytes[offset]);
            decoded.temperature_error = readUInt16LE(bytes.slice(offset + 1, offset + 3)) / 10;
            offset += 3;
            break;
        case 0xac: // valve_control_algorithm
            decoded.valve_control_algorithm = readUInt8(bytes[offset]);
            offset += 1;
            break;
        case 0xb0: // freeze_protection_config(enable, temperature)
            decoded.freeze_protection_config = decoded.freeze_protection_config || {};
            decoded.freeze_protection_config.enable = readUInt8(bytes[offset]);
            decoded.freeze_protection_config.temperature = readInt16LE(bytes.slice(offset + 1, offset + 3)) / 10;
            offset += 3;
            break;
        case 0xaf: // open_window_detection(enable, rate, time)
            decoded.open_window_detection = decoded.open_window_detection || {};
            decoded.open_window_detection.enable = readUInt8(bytes[offset]);
            decoded.open_window_detection.temperature_threshold = readInt8(bytes[offset + 1]) / 10;
            decoded.open_window_detection.time = readUInt16LE(bytes.slice(offset + 2, offset + 4));
            offset += 4;
            break;
        case 0x57: // restore_open_window_detection
            decoded.restore_open_window_detection = 1;
            offset += 1;
            break;
        case 0xb4: // valve_opening
            decoded.valve_opening = readUInt8(bytes[offset]);
            offset += 1;
            break;
        case 0xad: // valve_calibration
            decoded.valve_calibration = 1;
            offset += 1;
            break;
        case 0x25: // child_lock_config
            decoded.child_lock_config = decoded.child_lock_config || {};
            decoded.child_lock_config.enable = readUInt8(bytes[offset]);
            offset += 1;
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

function handle_downlink_response(channel_type, bytes, offset) {
    var decoded = {};

    switch (channel_type) {
        case 0x17: // timezone
            decoded.timezone = readInt16LE(bytes.slice(offset, offset + 2)) / 10;
            offset += 2;
            break;
        case 0x4a: // sync_time
            decoded.sync_time = 1;
            offset += 1;
            break;
        case 0x8e: // report_interval
            // ignore the first byte
            decoded.report_interval = readUInt16LE(bytes.slice(offset + 1, offset + 3));
            offset += 3;
            break;
        case 0x3b: // time_sync_enable
            decoded.time_sync_enable = readUInt8(bytes[offset]);
            offset += 1;
            break;
        case 0xb3: // temperature_control(enable)
            decoded.temperature_control = decoded.temperature_control || {};
            decoded.temperature_control.enable = bytes[offset];
            offset += 1;
            break;
        case 0xae: // temperature_control(mode)
            decoded.temperature_control = decoded.temperature_control || {};
            decoded.temperature_control.mode = bytes[offset];
            offset += 1;
            break;
        case 0xab: // temperature_calibration(enable, temperature)
            decoded.temperature_calibration = {};
            decoded.temperature_calibration.enable = bytes[offset];
            if (decoded.temperature_calibration.enable === 1) {
                decoded.temperature_calibration.temperature = readInt16LE(bytes.slice(offset + 1, offset + 3)) / 10;
            }
            offset += 3;
            break;
        case 0xb1: // temperature_target, temperature_error
            decoded.temperature_target = readInt8(bytes[offset]);
            decoded.temperature_error = readUInt16LE(bytes.slice(offset + 1, offset + 3)) / 10;
            offset += 3;
            break;
        case 0xac: // valve_control_algorithm
            decoded.valve_control_algorithm = readUInt8(bytes[offset]);
            offset += 1;
            break;
        case 0xb0: // freeze_protection_config(enable, temperature)
            decoded.freeze_protection_config = decoded.freeze_protection_config || {};
            decoded.freeze_protection_config.enable = readUInt8(bytes[offset]);
            if (decoded.freeze_protection_config.enable === 1) {
                decoded.freeze_protection_config.temperature = readInt16LE(bytes.slice(offset + 1, offset + 3)) / 10;
            }
            offset += 3;
            break;
        case 0xaf: // open_window_detection(enable, rate, time)
            decoded.open_window_detection = decoded.open_window_detection || {};
            decoded.open_window_detection.enable = readUInt8(bytes[offset]);
            if (decoded.open_window_detection.enable === 1) {
                decoded.open_window_detection.temperature_threshold = readInt8(bytes[offset + 1]) / 10;
                decoded.open_window_detection.time = readUInt16LE(bytes.slice(offset + 2, offset + 4));
            }
            offset += 4;
            break;
        case 0x57: // restore_open_window_detection
            decoded.restore_open_window_detection = 1;
            offset += 1;
            break;
        case 0xb4: // valve_opening
            decoded.valve_opening = readUInt8(bytes[offset]);
            offset += 1;
            break;
        case 0xad: // valve_calibration
            decoded.valve_calibration = 1;
            offset += 1;
            break;
        case 0x25: // child_lock_config
            decoded.child_lock_config = decoded.child_lock_config || {};
            decoded.child_lock_config.enable = readUInt8(bytes[offset]);
            offset += 1;
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
