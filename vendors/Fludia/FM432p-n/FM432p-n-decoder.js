/**
 * FM432p-n decoder — LoRaWAN IoT pulse sensor (nc version, no remote config)
 * T1: 10/15/60-min increment (0x2B/0x2C/0x2D) → 3B index + 8 pulse increments
 * T2: nc_10/15/60mn (0x29) → 3B ASCII firmware, 4B index, number_of_values, time_step
 * Ref: User_Guide_FM432-MAN432_EN_v1_2_4.pdf + Fludia official decoder
 */
function decode(bytes) {
    if (!bytes || bytes.length === 0) return {};
    var header = bytes[0];
    var result = { message_type: "unknown" };

    // T1: 10/15/60-min increment data (8 increments)
    if (header === 0x2B || header === 0x2C || header === 0x2D) {
        result.message_type = "increment";
        if (header === 0x2B) result.time_step = 10;
        else if (header === 0x2C) result.time_step = 15;
        else result.time_step = 60;
        result.index = (bytes[1] << 16) + (bytes[2] << 8) + bytes[3];
        for (var i = 0; i < 8; i++) {
            result["index_energy_increment_t" + i] = (bytes[4 + i * 2] << 8) + bytes[4 + i * 2 + 1];
        }
    }
    // T2: nc_10/15/60-min service (10 bytes)
    else if (header === 0x29) {
        result.message_type = "service";
        result.firmware_version = String.fromCharCode(bytes[1]) + "." + String.fromCharCode(bytes[2]) + "." + String.fromCharCode(bytes[3]);
        result.index = (bytes[4] << 24) + (bytes[5] << 16) + (bytes[6] << 8) + bytes[7];
        result.number_of_values = bytes[8];
        var ts = bytes[9];
        result.time_step = ts === 0x0A ? 10 : ts === 0x0F ? 15 : ts === 0x3C ? 60 : ts;
    }

    return result;
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
