var packetTypes = {
    0: ["CMi4110", "Standard", "Landis+Gyr"],
    1: ["CMi4110", "Compact", "Landis+Gyr"],
    2: ["CMi4110", "JSON", "Landis+Gyr"],
    3: ["CMi4110", "Scheduled Daily Redundant", "Landis+Gyr", ["", "", "", "accAt24", ""]],
    4: ["CMi4110", "Scheduled Extended", "Landis+Gyr"],
    63: ["CMi4110", "Scheduled Extended+", "Landis+Gyr", ["", "tariff1", "tariff2", "tariff3", "", ""]],
    64: ["CMi4110", "Scheduled Extended+ 2", "Landis+Gyr"],
    65: ["CMi4110", "Compact Tariff", "Landis+Gyr", ["", "tariff1", "tariff2", "tariff3", "", ""]],
    70: ["CMi4110", "Maximum Flow", "Landis+Gyr"],
    71: ["CMi4110", "Scheduled Daily Redundant Tariff", "Landis+Gyr", ["at24", "", "", "", "", ""]],
    72: ["CMi4110", "Scheduled Daily Redundant Tariff 2", "Landis+Gyr"],
    73: ["CMi4110", "Scheduled Monthly", "Landis+Gyr"],
    74: ["CMi4110", "Scheduled Daily", "Landis+Gyr", ["at24", "", "", "", "", ""]],
    5: ["CMi4111", "Standard", "Landis+Gyr"],
    6: ["CMi4111", "Compact", "Landis+Gyr"],
    7: ["CMi4111", "JSON", "Landis+Gyr"],
    8: ["CMi4111", "Scheduled - Daily redundant", "Landis+Gyr", ["", "", "", "", "", "accAt24"]],
    9: ["CMi4111", "Scheduled - Extended", "Landis+Gyr"],
    10: ["CMi4111", "Combined heat/cooling", "Landis+Gyr"],
    11: ["CMi4111", "Simple billing", "Landis+Gyr"],
    12: ["CMi4111", "Plausibility check", "Landis+Gyr"],
    13: ["CMi4111", "Monitoring", "Landis+Gyr"],
    15: ["CMi4130", "Standard", "Itron"],
    16: ["CMi4130", "Compact", "Itron"],
    17: ["CMi4130", "JSON", "Itron"],
    18: ["CMi4130", "Scheduled - Daily redundant", "Itron", ["", "", "", "", "", "accAt24"]],
    19: ["CMi4130", "Scheduled - Extended", "Itron"],
    20: ["CMi4130", "Combined heat/cooling", "Itron"],
    21: ["CMi4140", "Standard", "Kamstrup"],
    22: ["CMi4140", "Compact", "Kamstrup"],
    23: ["CMi4140", "JSON", "Kamstrup"],
    24: ["CMi4140", "Scheduled Daily Redundant", "Kamstrup"],
    25: ["CMi4140", "Scheduled Extended", "Kamstrup"],
    26: ["CMi4140", "Combined heating/cooling", "Kamstrup"],
    27: ["CMi4140", "Heat Intelligence", "Kamstrup", ["E1", "E3", "", "", "", ""]],
    59: ["CMi4140", "Scheduled Extended+", "Kamstrup"],
    60: ["CMi4140", "Scheduled Extended+ 2", "Kamstrup"],
    28: ["CMi4140", "Pulse", "Kamstrup"],
    29: ["CMi4140", "Pulse 2", "Kamstrup"],
    77: ["CMi4140", "Pulse Extended", "Kamstrup"],
    78: ["CMi4140", "Pulse Extended 2", "Kamstrup"],
    79: ["CMi4140", "DR0 message", "Kamstrup"],
    30: ["CMi4160", "Standard", "Diehl"],
    31: ["CMi4160", "Compact", "Diehl"],
    32: ["CMi4160", "JSON", "Diehl"],
    33: ["CMi4160", "Scheduled - Daily redundant", "Diehl"],
    34: ["CMi4160", "Scheduled - Extended", "Diehl"],
    35: ["CMi4160", "Combined heat/cooling", "Diehl"],
    61: ["CMi4160", "Scheduled Extended+", "Diehl"],
    62: ["CMi4160", "Scheduled Extended+ 2", "Diehl"],
    36: ["CMi4170", "Standard", "Engelmann"],
    37: ["CMi4170", "Compact", "Engelmann"],
    38: ["CMi4170", "JSON", "Engelmann"],
    39: ["CMi4170", "Scheduled - daily redundant", "Engelmann"],
    40: ["CMi4170", "Scheduled - Extended", "Engelmann"],
    41: ["CMi4170", "Combined heat/cooling", "Engelmann"],
    44: ["CMi4170", "Engelmann", "Engelmann"],
    45: ["CMi4170", "Engelmann 2", "Engelmann"],
    80: ["CMi4170", "DR0 message", "Engelmann"]
};

var valueMap = {
    "0x0400": ["energy", "Wh", 0.001],
    "0x0401": ["energy", "Wh", 0.01],
    "0x0402": ["energy", "Wh", 0.1],
    "0x0403": ["energy", "Wh", 1],
    "0x0404": ["energy", "Wh", 10],
    "0x0405": ["energy", "Wh", 100],
    "0x0406": ["energy", "kWh", 1],
    "0x0407": ["energy", "kWh", 10],
    "0x0408": ["energy", "J", 1],
    "0x0409": ["energy", "J", 10],
    "0x040a": ["energy", "J", 100],
    "0x040b": ["energy", "J", 1000],
    "0x040c": ["energy", "J", 10000],
    "0x040d": ["energy", "J", 100000],
    "0x040e": ["energy", "MJ", 1],
    "0x040f": ["energy", "MJ", 10],
    "0x04fb": {
        "0x0d": ["energy", "MCal", 1],
        "0x0e": ["energy", "MCal", 10],
        "0x0f": ["energy", "MCal", 100],
        "0x8d": ["coolingEnergy", "MCal", 1],
        "0x8e": ["coolingEnergy", "MCal", 10],
        "0x8f": ["coolingEnergy", "MCal", 100]
    },
    "0x4400": ["accumulatedEnergy", "Wh", 0.001],
    "0x4401": ["accumulatedEnergy", "Wh", 0.01],
    "0x4402": ["accumulatedEnergy", "Wh", 0.1],
    "0x4403": ["accumulatedEnergy", "Wh", 1],
    "0x4404": ["accumulatedEnergy", "Wh", 10],
    "0x4405": ["accumulatedEnergy", "Wh", 100],
    "0x4406": ["accumulatedEnergy", "kWh", 1],
    "0x4407": ["accumulatedEnergy", "kWh", 10],
    "0x440e": ["accumulatedEnergy", "MJ", 1],
    "0x440f": ["accumulatedEnergy", "MJ", 10],
    "0x44fb": {
        "0x0d": ["accumulatedEnergy", "MCal", 1],
        "0x0e": ["accumulatedEnergy", "MCal", 10],
        "0x0f": ["accumulatedEnergy", "MCal", 100]
    },
    "0x0480": ["coolingEnergy", "Wh", 0.001],
    "0x0481": ["coolingEnergy", "Wh", 0.01],
    "0x0482": ["coolingEnergy", "Wh", 0.1],
    "0x0483": ["coolingEnergy", "Wh", 1],
    "0x0484": ["coolingEnergy", "Wh", 10],
    "0x0485": ["coolingEnergy", "Wh", 100],
    "0x0486": ["coolingEnergy", "kWh", 1],
    "0x0487": ["coolingEnergy", "kWh", 10],
    "0x048e": ["coolingEnergy", "MJ", 1],
    "0x048f": ["coolingEnergy", "MJ", 10],
    "0x04ff": {
        "0x07": ["energyE8", "m³*°C", 1],
        "0x08": ["energyE9", "m³*°C", 1]
    },
    "0x0410": ["volume", "m³", 0.000001],
    "0x0411": ["volume", "m³", 0.00001],
    "0x0412": ["volume", "m³", 0.0001],
    "0x0413": ["volume", "m³", 0.001],
    "0x0414": ["volume", "m³", 0.01],
    "0x0415": ["volume", "m³", 0.1],
    "0x0416": ["volume", "m³", 1],
    "0x0417": ["volume", "m³", 10],
    "0x0228": ["power", "W", 0.001],
    "0x0229": ["power", "W", 0.01],
    "0x022a": ["power", "W", 0.1],
    "0x022b": ["power", "W", 1],
    "0x022c": ["power", "W", 10],
    "0x022d": ["power", "W", 100],
    "0x022e": ["power", "kW", 1],
    "0x022f": ["power", "kW", 10],
    "0x023b": ["flow", "m³/h", 0.001],
    "0x023c": ["flow", "m³/h", 0.01],
    "0x023d": ["flow", "m³/h", 0.1],
    "0x023e": ["flow", "m³/h", 1],
    "0x023f": ["flow", "m³/h", 10],
    "0x1258": ["maxForwardTemperature", "°C", 0.001],
    "0x1259": ["maxForwardTemperature", "°C", 0.01],
    "0x125a": ["maxForwardTemperature", "°C", 0.1],
    "0x125b": ["maxForwardTemperature", "°C", 1],
    "0x0258": ["forwardTemperature", "°C", 0.001],
    "0x0259": ["forwardTemperature", "°C", 0.01],
    "0x025a": ["forwardTemperature", "°C", 0.1],
    "0x025b": ["forwardTemperature", "°C", 1],
    "0x125c": ["maxReturnTemperature", "°C", 0.001],
    "0x125d": ["maxReturnTemperature", "°C", 0.01],
    "0x125e": ["maxReturnTemperature", "°C", 0.1],
    "0x125f": ["maxReturnTemperature", "°C", 1],
    "0x025c": ["returnTemperature", "°C", 0.001],
    "0x025d": ["returnTemperature", "°C", 0.01],
    "0x025e": ["returnTemperature", "°C", 0.1],
    "0x025f": ["returnTemperature", "°C", 1],
    "0x07ff": {
        "0xa0": ["powerFlows", null, null],
        "0x21": ["meterInfo", null, null]
    },
    "0x0a58": ["forwardTemperature", "°C", 0.001],
    "0x0a59": ["forwardTemperature", "°C", 0.01],
    "0x0a5a": ["forwardTemperature", "°C", 0.1],
    "0x0a5b": ["forwardTemperature", "°C", 1],
    "0x0a5c": ["returnTemperature", "°C", 0.001],
    "0x0a5d": ["returnTemperature", "°C", 0.01],
    "0x0a5e": ["returnTemperature", "°C", 0.1],
    "0x0a5f": ["returnTemperature", "°C", 1],
    "0x0b2b": ["power", "kW", 0.001],
    "0x0b2c": ["power", "kW", 0.01],
    "0x0b2d": ["power", "kW", 0.1],
    "0x0b2e": ["power", "kW", 1],
    "0x0b3b": ["flow", "m³/h", 0.001],
    "0x0b3c": ["flow", "m³/h", 0.01],
    "0x0b3d": ["flow", "m³/h", 0.1],
    "0x0b3e": ["flow", "m³/h", 1],
    "0x0c06": ["energy", "kWh", 1],
    "0x0c07": ["energy", "MWh", 0.01],
    "0x0cfb": {
        "0x00": ["energy", "MWh", 0.1],
        "0x01": ["energy", "MWh", 1],
        "0x08": ["energy", "GJ", 0.1],
        "0x09": ["energy", "GJ", 1]
    },
    "0x0c0e": ["energy", "GJ", 0.001],
    "0x0c0f": ["energy", "GJ", 0.01],
    "0x0c14": ["volume", "m³", 0.01],
    "0x0c15": ["volume", "m³", 0.1],
    "0x0c16": ["volume", "m³", 1],
    "0x8402": {
        "0x03": ["tarif2energy", "Wh", 1]
    },
    "0x8403": {
        "0x03": ["tarif3energy", "Wh", 1]
    },
    "0x8440": {
        "0x13": ["pulse1volume", "m³", 0.001],
        "0x14": ["pulse1volume", "m³", 0.01],
        "0x15": ["pulse1volume", "m³", 0.1],
        "0x06": ["pulse1energy", "MWh", 0.001],
        "0x07": ["pulse1energy", "MWh", 0.01]
    },
    "0x8480": {
        "0x04": {
            "0x13": ["pulse2volume", "m³", 0.001],
            "0x14": ["pulse2volume", "m³", 0.01],
            "0x15": ["pulse2volume", "m³", 0.1],
            "0x06": ["pulse2energy", "MWh", 0.001],
            "0x07": ["pulse2energy", "MWh", 0.01]
        }
    },
    "0x84c0": {
        "0x04": {
            "0x13": ["pulse3volume", "m³", 0.001],
            "0x14": ["pulse3volume", "m³", 0.01],
            "0x15": ["pulse3volume", "m³", 0.1],
            "0x06": ["pulse3energy", "MWh", 0.001],
            "0x07": ["pulse3energy", "MWh", 0.01]
        }
    },
    "0x8c01": {
        "0x06": ["energyAtDueDate", "kWh", 1]
    },
    "0x8c10": ["tariff1energy", null, 1],
    "0x8c20": ["tariff2energy", null, 1],
    "0x9b01": {
        "0x3b": ["maxFlow", "m³/h", 0.001]
    },
    "0x4c06": ["energy", "kWh", 1],
    "0x4c07": ["energy", "MWh", 0.01],
    "0x4c0e": ["energy", "GJ", 0.001],
    "0x4c0f": ["energy", "GJ", 0.01],
    "0x4c14": ["volume", "m³", 0.01],
    "0x4c15": ["volume", "m³", 0.1],
    "0x4c16": ["volume", "m³", 1],
    "0xb401": {
        "0x00": ["previousMonthEnergy", "Wh", 0.001],
        "0x01": ["previousMonthEnergy", "Wh", 0.01],
        "0x02": ["previousMonthEnergy", "Wh", 0.1],
        "0x03": ["previousMonthEnergy", "Wh", 1],
        "0x04": ["previousMonthEnergy", "Wh", 10],
        "0x05": ["previousMonthEnergy", "Wh", 100],
        "0x06": ["previousMonthEnergy", "kWh", 1],
        "0x07": ["previousMonthEnergy", "kWh", 10],
        "0x0e": ["previousMonthEnergy", "MJ", 1],
        "0x0f": ["previousMonthEnergy", "MJ", 10]
    },
    "0x0420": ["S", "s", 1],
    "0x0421": ["Min", "min", 1],
    "0x0422": ["H", "h", 1],
    "0x0423": ["Days", "days", 1],
    "0xcc10": {
        "0x07": ["at24tariff1energy", null, 1]
    },
    "0xcc20": {
        "0x07": ["at24tariff2energy", null, 1]
    },
    "0x0c78": ["meterId", null, null],
    "0x0c79": ["customerMeterId", null, null],
    "0x06ff": {
        "0x21": ["meterId", null, null]
    },
    "0x0779": ["enhancedMeterId", null, null],
    "0x01fd": {
        "0x17": ["errorFlags", null, 1]
    },
    "0x02fd": {
        "0x17": ["errorFlags", null, 1]
    },
    "0x04fd": {
        "0x17": ["errorFlags", null, 1]
    }
};

function readUInt16BE(bytes, pos) {
    return (bytes[pos] << 8) + bytes[pos + 1];
}

function readInt16LE(bytes, pos) {
    var value = (bytes[pos + 1] << 8) + bytes[pos];
    return value > 0x7fff ? value - 0x10000 : value;
}

function readUInt32LE(bytes, pos) {
    return (bytes[pos + 3] << 24) + (bytes[pos + 2] << 16) + (bytes[pos + 1] << 8) + bytes[pos];
}

function readInt32LE(bytes, pos) {
    var value = readUInt32LE(bytes, pos);
    return value > 0x7fffffff ? value - 0x100000000 : value;
}

function readUInt8(bytes, pos) {
    return bytes[pos];
}

function readBCD(bytes, pos, size) {
    var value = 0;
    var i;
    for (i = size - 1; i >= 0; i--) {
        var byte = bytes[pos + i];
        var high = (byte >> 4) & 0x0f;
        var low = byte & 0x0f;
        value = value * 100 + high * 10 + low;
    }
    return value;
}

function padZero(str, len) {
    while (str.length < len) {
        str = "0" + str;
    }
    return str;
}

function decodeUplink(input) {
    var r = input.bytes;
    var pos = 0;
    var measurementNo = 0;
    var data = {};
    var traces = [];
    var trace = {};
    var debug = input.debug || false;
    var i;

    try {
        data.messageFormat = readUInt8(r, pos);
        pos++;
        var packetInfo = packetTypes[data.messageFormat];
        if (typeof packetInfo === "undefined") {
            throw new Error("Unsupported message format 0x" + data.messageFormat.toString(16));
        }

        data.messageFormatInfo = packetInfo.slice(0, 3);

        if (data.messageFormatInfo[1] === "JSON") {
            var jsonString = String.fromCharCode.apply(null, r.slice(1));
            var measurements = JSON.parse(jsonString);
            var unified = {
                messageFormat: data.messageFormat.toString(16),
                energy: measurements.E,
                energyUnit: measurements.U,
                meterId: measurements.ID
            };

            if (debug) {
                traces.push({
                    headerStart: 0,
                    headerInfo: jsonString,
                    dataStart: 1,
                    dataEnd: r.length - 2
                });
            }

            var result = {
                data: {},
                payload: "",
                traces: traces,
                warnings: [],
                errors: []
            };
            for (i in data) {
                result.data[i] = data[i];
            }
            for (i in unified) {
                result.data[i] = unified[i];
            }
            var payload = [];
            for (i = 0; i < r.length; i++) {
                payload.push(padZero(r[i].toString(16), 2));
            }
            result.payload = payload.join("");
            return result;
        }

        while (pos < r.length) {
            var dif = readUInt16BE(r, pos);
            var size = r[pos] & 0x0f;
            trace = {
                headerStart: pos
            };
            pos += 2;

            if (dif === 0x046d || dif === 0x346d) {
                trace.dataStart = pos;
                var ts = r.slice(pos, pos + 4);
                pos += 4;
                if (!(ts[1] & 0x01)) {
                    var year = 1900 + 100 * (ts[1] >> 5);
                    year += ((ts[3] >> 4) << 3) | (ts[2] >> 5);
                    data.timeStamp = year + "-" +
                        ("0" + (ts[3] & 0x0f)).slice(-2) + "-" +
                        ("0" + (ts[2] & 0x1f)).slice(-2) + "T" +
                        ("0" + (ts[1] & 0x1f)).slice(-2) + ":" +
                        ("0" + (ts[0] & 0x7f)).slice(-2) + "Z";
                }
                if (debug) {
                    var traceCopy = {};
                    for (i in trace) {
                        traceCopy[i] = trace[i];
                    }
                    traceCopy.headerInfo = ["timeStamp", null, null];
                    traceCopy.dataStart = trace.dataStart;
                    traceCopy.dataEnd = pos - 1;
                    traces.push(traceCopy);
                }
                measurementNo++;
                continue;
            }

            var mapKey = (dif >> 12) === 0x03 ? (dif & 0xfff).toString(16) : dif.toString(16);
            var map = valueMap["0x" + ("0000" + mapKey).slice(-4)];
            if (typeof map === "undefined") {
                dif &= 0x0fff;
                throw new Error("Unknown measurement " + dif.toString(16));
            }

            while (!Array.isArray(map)) {
                var subType = readUInt8(r, pos);
                pos++;
                var subMap = map["0x" + ("00" + subType.toString(16)).slice(-2)];
                if (typeof subMap === "undefined") {
                    throw new Error("Unknown measurement " + dif.toString(16) + " subtype " + subType.toString(16));
                }
                map = subMap;
            }

            var name = (packetInfo.length === 3) ? map[0] : packetInfo[3][measurementNo] + map[0];

            if (name === "coolingEnergy") {
                var flag = readInt16LE(r, pos);
                if (flag === 0xff02) {
                    pos += 2;
                } else if (flag === 0xff03) {
                    name = "error" + name;
                    pos += 2;
                }
            }

            trace.headerInfo = [name, map[1], map[2]];
            trace.dataStart = pos;

            var value = 0;
            switch (size) {
                case 0x1:
                    value = readUInt8(r, pos);
                    break;
                case 0x2:
                    value = readInt16LE(r, pos);
                    break;
                case 0x4:
                    value = readInt32LE(r, pos);
                    break;
                case 0xa:
                    value = readBCD(r, pos, 2);
                    size = 2;
                    break;
                case 0xb:
                    value = readBCD(r, pos, 3);
                    size = 3;
                    break;
                case 0xc:
                    value = readBCD(r, pos, 4);
                    size = 4;
                    break;
                default:
                    throw new Error("Unsupported size: " + size);
            }
            pos += size;

            if (map[1] !== null) {
                data[name + "Unit"] = map[1];
            }

            if (map[2] !== null) {
                value *= map[2];
            }

            if ((dif >> 12) === 0x3) {
                data[name + "Error"] = true;
            }

            data[name] = (typeof value === "number" && value % 1 === 0) ? value : parseFloat(value.toFixed(8));
            measurementNo++;

            trace.dataEnd = pos - 1;

            if (debug) {
                traces.push(trace);
            }
        }
    } catch (e) {
        traces.push(trace);
        data.messageFormat = "0x" + data.messageFormat.toString(16);
        var errorResult = {
            data: data,
            payload: "",
            traces: traces,
            errors: [e.message]
        };
        var errorPayload = [];
        for (i = 0; i < r.length; i++) {
            errorPayload.push(padZero(r[i].toString(16), 2));
        }
        errorResult.payload = errorPayload.join("");
        return errorResult;
    }

    data.messageFormat = data.messageFormat.toString(16);
    var finalResult = {
        data: data,
        payload: "",
        traces: traces,
        warnings: [],
        errors: []
    };
    var finalPayload = [];
    for (i = 0; i < r.length; i++) {
        finalPayload.push(padZero(r[i].toString(16), 2));
    }
    finalResult.payload = finalPayload.join("");
    return finalResult;
}

function Decode(fPort, bytes) {
    return decodeUplink({ bytes: bytes, debug: false });
}