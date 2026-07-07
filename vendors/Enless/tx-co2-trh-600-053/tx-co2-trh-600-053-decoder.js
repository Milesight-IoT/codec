var ENLESS_600_050 = 0x27; /* TX T&H MINI 600-050 */
var ENLESS_600_051 = 0x1F; /* TX T&H AMB 600-051 */
var ENLESS_600_052 = 0x20; /* TX T&H E-INK AMB 600-052 */
var ENLESS_600_053 = 0x25; /* TX CO2 T&H AMB 600-053 */
var ENLESS_600_062 = 0x22; /* TX LIGHT PIR T&H 600-062 */
var ENLESS_600_065 = 0x26; /* TX WINDOW 600-065 */

function toHexString(byteArray) {
    return Array.from(byteArray, function (byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
}

function _decodeUplinkRaw(input) {
    try {
        var payload = toHexString(input.bytes);
        var deviceType = hexToUInt(payload.substring(6, 8), 1);
        return bin_decode(deviceType, payload);
    } catch (e) {
        return { data: { error: "decoding failed" } };
    }
}

function bin_decode(deviceType, payload) {
    try {
        var template = {
            id: hexToUInt(payload.substring(0, 6)),
            type: hexToUInt(payload.substring(6, 8)),
            seq_counter: hexToUInt(payload.substring(8, 10)),
            fw_version: hexToFwVersion(payload.substring(10, 12)),
        };

        var isLogging = (payload.length === 68);

        switch (deviceType) {
            case ENLESS_600_050: /* TX T&H MINI 600-050 */
            case ENLESS_600_051: /* TX T&H AMB 600-051 */
                if (isLogging) {
                    return decodeLoggingTH(payload, deviceType, template);
                }
                addValueField(template, {
                    temperature: {
                        unit: "°C",
                        value: hexToInt(payload.substring(12, 16), 10),
                    },
                    humidity: {
                        unit: "%",
                        value: hexToUInt(payload.substring(20, 24), 10),
                    },
                });
                addAlarmStateField(template,
                    alarmParserV2(payload.substring(52, 56), deviceType));
                addStateField(template, {
                    battery: hexToBatteryLvl(payload.substring(56, 60)),
                    msg_type: hexToMsgType(payload.substring(56, 60)),
                    rbe: hexToRBE(payload.substring(56, 60)),
                });
                return { data: template };

            case ENLESS_600_052: /* TX T&H E-INK AMB 600-052 */
                addValueField(template, {
                    temperature: {
                        unit: "°C",
                        value: hexToInt(payload.substring(12, 16), 10),
                    },
                    humidity: {
                        unit: "%",
                        value: hexToUInt(payload.substring(20, 24), 10),
                    },
                });
                addAlarmStateField(template,
                    alarmParserV2(payload.substring(52, 56), deviceType));
                addStateField(template, {
                    battery: hexToBatteryLvl(payload.substring(56, 60)),
                    msg_type: hexToMsgType(payload.substring(56, 60)),
                    rbe: hexToRBE(payload.substring(56, 60)),
                });
                return { data: template };

            case ENLESS_600_053: /* TX CO2 T&H AMB 600-053 */
                addValueField(template, {
                    temperature: {
                        unit: "°C",
                        value: hexToInt(payload.substring(12, 16), 10),
                    },
                    humidity: {
                        unit: "%",
                        value: hexToUInt(payload.substring(20, 24), 10),
                    },
                    co2: {
                        unit: "ppm",
                        value: hexToUInt(payload.substring(24, 28), 1),
                    },
                });
                addAlarmStateField(template,
                    alarmParserV2(payload.substring(52, 56), deviceType));
                addStateField(template, {
                    battery: hexToBatteryLvl(payload.substring(56, 60)),
                    msg_type: hexToMsgType(payload.substring(56, 60)),
                    led: hexToRBE(payload.substring(56, 60)),
                    co2_sampled: hexToCO2Sampled(payload.substring(56, 60)),
                });
                return { data: template };

            case ENLESS_600_062: /* TX LIGHT PIR T&H 600-062 */
                addValueField(template, {
                    temperature: {
                        unit: "°C",
                        value: hexToInt(payload.substring(12, 16), 10),
                    },
                    humidity: {
                        unit: "%",
                        value: hexToUInt(payload.substring(20, 24), 10),
                    },
                    pir_count: {
                        unit: "",
                        value: hexToUInt(payload.substring(32, 36), 1),
                    },
                    luminosity: {
                        unit: "lux",
                        value: hexToUInt(payload.substring(44, 52), 1),
                    },
                });
                addAlarmStateField(template,
                    alarmParserV2(payload.substring(52, 56), deviceType));
                addStateField(template, {
                    battery: hexToBatteryLvl(payload.substring(56, 60)),
                    msg_type: hexToMsgType(payload.substring(56, 60)),
                    rbe: hexToRBE(payload.substring(56, 60)),
                    movement_detected: hexToMovementDetected(payload.substring(56, 60)),
                });
                return { data: template };

            case ENLESS_600_065: /* TX WINDOW 600-065 */
                addValueField(template, {
                    window_count: {
                        unit: "",
                        value: hexToUInt(payload.substring(32, 36), 1),
                    },
                });
                addAlarmStateField(template,
                    alarmParserV2(payload.substring(52, 56), deviceType));
                addStateField(template, {
                    battery: hexToBatteryLvl(payload.substring(56, 60)),
                    msg_type: hexToMsgType(payload.substring(56, 60)),
                    rbe: hexToRBE(payload.substring(56, 60)),
                    window_opened: hexToWindowOpened(payload.substring(56, 60)),
                });
                return { data: template };

            default:
                return {
                    data: null,
                    error: "Unknown V2 device type: " + deviceType,
                };
        }
    } catch (error) {
        return { data: null, error: "decoding failed" };
    }
}

function decodeLoggingTH(payload, deviceType, template) {
    var offset = 12;
    for (var i = 0; i < 12; i++) {
        addValueField(template, {
            ["temperature_t-" + (i * 5)]: {
                unit: "°C",
                value: hexToInt(payload.substring(offset, offset + 2), 1),
            },
        });
        offset += 2;
        addValueField(template, {
            ["humidity_t-" + (i * 5)]: {
                unit: "%",
                value: hexToUInt(payload.substring(offset, offset + 2), 1),
            },
        });
        offset += 2;
    }
    addAlarmStateField(template,
        alarmParserV2(payload.substring(60, 64), deviceType));
    addStateField(template, {
        battery: hexToBatteryLvl(payload.substring(64, 68)),
        msg_type: hexToMsgType(payload.substring(64, 68)),
        rbe: hexToRBE(payload.substring(64, 68)),
    });
    return { data: template };
}

function addValueField(template, valueDefinition) {
    template.values = valueDefinition;
}

function addAlarmStateField(template, stateDefinition) {
    template.alarm_status = stateDefinition;
}

function addStateField(template, stateDefinition) {
    template.states = stateDefinition;
}

function alarmParserV2(hexValue, type) {
    var defs;
    switch (type) {
        case ENLESS_600_050:
            defs = [
                { name: "temperature", values: [{ high: false }, { high: true }], bit: 1 },
                { name: "temperature", values: [{ low: false }, { low: true }], bit: 2 },
                { name: "humidity", values: [{ high: false }, { high: true }], bit: 3 },
                { name: "humidity", values: [{ low: false }, { low: true }], bit: 4 },
            ];
            break;
        case ENLESS_600_051:
        case ENLESS_600_052:
        case ENLESS_600_062:
            defs = [
                { name: "temperature", values: [{ high: false }, { high: true }], bit: 1 },
                { name: "temperature", values: [{ low: false }, { low: true }], bit: 2 },
                { name: "humidity", values: [{ high: false }, { high: true }], bit: 3 },
                { name: "humidity", values: [{ low: false }, { low: true }], bit: 4 },
                { name: "MotionGuard", values: ["normal", "alarm"], bit: 9 },
            ];
            break;
        case ENLESS_600_053:
            defs = [
                { name: "temperature", values: [{ high: false }, { high: true }], bit: 1 },
                { name: "temperature", values: [{ low: false }, { low: true }], bit: 2 },
                { name: "humidity", values: [{ high: false }, { high: true }], bit: 3 },
                { name: "humidity", values: [{ low: false }, { low: true }], bit: 4 },
                { name: "co2", values: [{ high: false }, { high: true }], bit: 5 },
                { name: "co2", values: [{ low: false }, { low: true }], bit: 6 },
                { name: "MotionGuard", values: ["normal", "alarm"], bit: 9 },
            ];
            break;
        case ENLESS_600_065:
            defs = [];
            break;
        default:
            defs = [];
            break;
    }
    return hexToStatus(hexValue, defs);
}

function hexToUInt(hex, divider) {
    return parseInt(hex, 16) / divider;
}

function hexToInt(hex, divider) {
    if (hex.length % 2 !== 0) {
        hex = "0" + hex;
    }
    var num = parseInt(hex, 16);
    var maxVal = Math.pow(2, hex.length / 2 * 8);
    if (num > maxVal / 2 - 1) {
        num = num - maxVal;
    }
    return num / divider;
}

function hexToBin(hex, numOfBytes) {
    return parseInt(hex, 16)
        .toString(2)
        .padStart(numOfBytes * 4, "0");
}

function hexToFwVersion(hex) {
    var binNum = hexToBin(hex);
    return parseInt(binNum.substring(binNum.length - 6, binNum.length), 2);
}

function hexToStatus(hex, defs) {
    var status = {};
    var binNum = hexToBin(hex, 4);
    defs.forEach(function (def) {
        var bitValue = +binNum[binNum.length - def.bit];
        var textValue = def.values[bitValue];
        if (status.hasOwnProperty(def.name)) {
            status[def.name] = Object.assign(status[def.name], textValue);
        } else {
            status[def.name] = textValue;
        }
    });
    return status;
}

function hexToBatteryLvl(hex) {
    var binNum = hexToBin(hex, 4);
    var batteryCode = binNum.substring(binNum.length - 4, binNum.length - 2);
    switch (batteryCode) {
        case "00": return "100%";
        case "01": return "75%";
        case "10": return "50%";
        case "11": return "25%";
        default: return "unknown";
    }
}

function hexToMsgType(hex) {
    var binNum = hexToBin(hex, 4);
    var bitValue = +binNum[binNum.length - 1];
    if (bitValue) return "alarm";
    return "normal";
}

function hexToRBE(hex) {
    var binNum = hexToBin(hex, 4);
    var bitValue = +binNum[binNum.length - 10];
    if (bitValue) return "TRUE";
    return "FALSE";
}

function hexToCO2Sampled(hex) {
    var binNum = hexToBin(hex, 4);
    var bitValue = +binNum[binNum.length - 7];
    if (bitValue) return "true";
    return "false";
}

function hexToMovementDetected(hex) {
    var binNum = hexToBin(hex, 4);
    var bitValue = +binNum[binNum.length - 5];
    if (bitValue) return "true";
    return "false";
}

function hexToWindowOpened(hex) {
    var binNum = hexToBin(hex, 4);
    var bitValue = +binNum[binNum.length - 6];
    if (bitValue) return "true";
    return "false";
}

/* flattening wrapper */
function decodeUplink(input) {
    var result = _decodeUplinkRaw(input);
    var d = (result && result.data) ? result.data : {};
    var vals = d.values || {};
    var states = d.states || {};
    var out = {};

    if (vals.temperature !== undefined) out.temperature = vals.temperature.value;
    if (vals.humidity !== undefined) out.humidity = vals.humidity.value;
    if (vals.co2 !== undefined) out.co2 = vals.co2.value;
    if (vals.pir_count !== undefined) out.pir_count = vals.pir_count.value;
    if (vals.luminosity !== undefined) out.luminosity = vals.luminosity.value;
    if (vals.window_count !== undefined) out.window_count = vals.window_count.value;

    if (states.battery !== undefined) out.battery = states.battery;
    if (states.msg_type !== undefined) out.msg_type = states.msg_type;
    if (states.rbe !== undefined) out.rbe = states.rbe;
    if (states.led !== undefined) out.led = states.led;
    if (states.co2_sampled !== undefined) out.co2_sampled = states.co2_sampled;
    if (states.movement_detected !== undefined) out.movement_detected = states.movement_detected;
    if (states.window_opened !== undefined) out.window_opened = states.window_opened;

    return { data: out };
}

function Decode(fPort, bytes) { return decodeUplink({ bytes: bytes, fPort: fPort }).data; }
function Decoder(bytes, port) { return decodeUplink({ bytes: bytes, fPort: port }).data; }