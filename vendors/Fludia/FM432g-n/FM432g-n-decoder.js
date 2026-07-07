/**
 * FM432g-n decoder — LoRaWAN IoT gas sensor
 * T1: 10/15/60-min increment (0x1D/0x1E/0x1F) → 3B index + 8 gas increments
 * T1: AP (0x6D) → time_step + 4B index + variable increments
 * T2: nc_10/15/60mn (0x10) → number_of_starts, param_id, 4B index, optical_head_info, time_step
 * T2: AP (0x6E) → number_of_starts, param_id, firmware, 4B index, time_step, number_of_values, redundancy
 * Ref: User_Guide_FM432-MAN432_EN_v1_2_4.pdf + Fludia official decoder
 */
function decode(bytes) {
    if (!bytes || bytes.length === 0) return {};
    var header = bytes[0];
    var result = { message_type: "unknown" };

    // T1: 10/15/60-min increment data (8 increments)
    if (header === 0x1D || header === 0x1E || header === 0x1F) {
        result.message_type = "increment";
        if (header === 0x1D) result.time_step = 10;
        else if (header === 0x1E) result.time_step = 15;
        else result.time_step = 60;
        result.index_gas_value = ((bytes[1] << 16) + (bytes[2] << 8) + bytes[3]) / 10;
        for (var i = 0; i < 8; i++) {
            result["index_gas_increment_t" + i] = ((bytes[4 + i * 2] << 8) + bytes[4 + i * 2 + 1]) / 10;
        }
    }
    // T1: AP variant
    else if (header === 0x6D) {
        result.message_type = "ap_data";
        result.time_step = bytes[1];
        result.index_gas_value = ((bytes[2] << 24) + (bytes[3] << 16) + (bytes[4] << 8) + bytes[5]) / 10;
        var n = 0;
        for (var i = 6; i + 1 < bytes.length; i += 2) {
            n++;
            result["index_gas_increment_t" + (n - 1)] = ((bytes[i] << 8) + bytes[i + 1]) / 10;
        }
    }
    // T2: nc_10/15/60-min service
    else if (header === 0x10) {
        result.message_type = "service";
        result.number_of_starts = bytes[1];
        result.param_id = bytes[3];
        result.firmware_version = (bytes[4] >> 2).toString();
        result.index_gas_value = ((bytes[5] << 24) + (bytes[6] << 16) + (bytes[7] << 8) + bytes[8]) / 10;
        var ts = bytes[11];
        result.time_step = ts === 0x00 ? 10 : ts === 0x03 ? 15 : ts === 0x01 ? 60 : ts;
    }
    // T2: AP service
    else if (header === 0x6E) {
        result.message_type = "ap_service";
        result.number_of_starts = bytes[1];
        result.param_id = bytes[4];
        result.firmware_version = bytes[5].toString();
        result.index_gas_value = ((bytes[8] << 24) + (bytes[9] << 16) + (bytes[10] << 8) + bytes[11]) / 10;
        result.time_step = bytes[12];
        result.number_of_values = bytes[13];
        result.redundancy = bytes[14] === 0x01;
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
