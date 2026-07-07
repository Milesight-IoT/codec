/**
 * FM432p-n_ap decoder — LoRaWAN IoT pulse sensor (AP version with remote config)
 * T1: AP (0x6B) → time_step + 4B index + variable increments
 * T2: AP (0x6C) → 3B ASCII firmware, 4B index, time_step, number_of_values, redundancy
 * Ref: User_Guide_FM432-MAN432_EN_v1_2_4.pdf + Fludia official decoder
 */
function decode(bytes) {
    if (!bytes || bytes.length === 0) return {};
    var header = bytes[0];
    var result = { message_type: "unknown" };

    // T1: AP variant
    if (header === 0x6B) {
        result.message_type = "ap_data";
        result.time_step = bytes[1];
        result.index = (bytes[2] << 24) + (bytes[3] << 16) + (bytes[4] << 8) + bytes[5];
        var n = 0;
        for (var i = 6; i + 1 < bytes.length; i += 2) {
            n++;
            result["index_energy_increment_t" + (n - 1)] = (bytes[i] << 8) + bytes[i + 1];
        }
    }
    // T2: AP service (11 bytes)
    else if (header === 0x6C) {
        result.message_type = "ap_service";
        result.firmware_version = String.fromCharCode(bytes[1]) + "." + String.fromCharCode(bytes[2]) + "." + String.fromCharCode(bytes[3]);
        result.index = (bytes[4] << 24) + (bytes[5] << 16) + (bytes[6] << 8) + bytes[7];
        result.time_step = bytes[8];
        result.number_of_values = bytes[9];
        result.redundancy = bytes[10] === 0x01;
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
