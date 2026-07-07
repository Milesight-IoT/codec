/**
 * FM432t decoder — LoRaWAN IoT temperature sensor
 * T1: temperature (0x57) → time_step + 20 temperatures (signed /100)
 * T2: service (0x58) → 3B ASCII firmware, time_step, max/min/variation temps (signed /100), sampling
 * Ref: User_Guide_FM432-MAN432_EN_v1_2_4.pdf + Fludia official decoder
 */
function decode(bytes) {
    if (!bytes || bytes.length === 0) return {};
    var header = bytes[0];
    var result = { message_type: "unknown" };

    // T1: temperature data (20 temperature values)
    if (header === 0x57) {
        result.message_type = "temperature";
        result.time_step = bytes[1];
        for (var i = 0; i < 20; i++) {
            var raw = (bytes[2 + i * 2] << 8) + bytes[2 + i * 2 + 1];
            result["temperature_t" + i] = toSignedInt16(raw) / 100;
        }
    }
    // T2: service message (24h stats)
    else if (header === 0x58) {
        result.message_type = "service";
        result.firmware_version = String.fromCharCode(bytes[1]) + "." + String.fromCharCode(bytes[2]) + "." + String.fromCharCode(bytes[3]);
        result.time_step = bytes[4];
        result.max_temperature = toSignedInt16((bytes[5] << 8) + bytes[6]) / 100;
        result.min_temperature = toSignedInt16((bytes[7] << 8) + bytes[8]) / 100;
        result.max_temperature_variation = toSignedInt16((bytes[9] << 8) + bytes[10]) / 100;
        result.sampling = bytes[11] === 0 ? "average" : "instantaneous";
    }

    return result;
}

function toSignedInt16(val) {
    return val & 0x8000 ? val - 0x10000 : val;
}

function decodeUplink(input) {
    return { data: decode(input.bytes) };
}

function Decode(fPort, bytes) {
    return decode(bytes);
}

function Decoder(bytes, port) {
    return decode(bytes);
}
