/**
 * FM432e decoder — LoRaWAN IoT electricity sensor
 * T1: 1-min power (0x5B) → 4B index + 20 power values
 * T1: 10/15/60-min increment (0x20/0x21/0x22) → 3B index + 8 increments
 * T1: AP (0x69) → time_step + 4B index + variable increments
 * T2: nc_1mn (0x51) → number_of_starts, param_id, 4B index, optical_head_info
 * T2: nc_10/15/60mn (0x0E) → number_of_starts, param_id, 4B index, optical_head_info, max_power, time_step
 * T2: AP (0x6A) → number_of_starts, param_id, firmware, meter_type, battery, 4B index, time_step, number_of_values, redundancy, sensitivity
 * Ref: User_Guide_FM432-MAN432_EN_v1_2_4.pdf + Fludia official decoder
 */
function decode(bytes) {
    if (!bytes || bytes.length === 0) return {};
    var header = bytes[0];
    var result = { message_type: "unknown" };

    // T1: 1-min power data (20 power values)
    if (header === 0x5B) {
        result.message_type = "power_1min";
        result.index = (bytes[1] << 24) + (bytes[2] << 16) + (bytes[3] << 8) + bytes[4];
        for (var i = 0; i < 20; i++) {
            result["power_t" + i] = (bytes[5 + i * 2] << 8) + bytes[5 + i * 2 + 1];
        }
    }
    // T1: 10/15/60-min increment data (8 increments)
    else if (header === 0x20 || header === 0x21 || header === 0x22) {
        result.message_type = "increment";
        if (header === 0x20) result.time_step = 10;
        else if (header === 0x21) result.time_step = 15;
        else result.time_step = 60;
        result.index = (bytes[1] << 16) + (bytes[2] << 8) + bytes[3];
        for (var i = 0; i < 8; i++) {
            result["index_energy_increment_t" + i] = (bytes[4 + i * 2] << 8) + bytes[4 + i * 2 + 1];
        }
    }
    // T1: AP variant
    else if (header === 0x69) {
        result.message_type = "ap_data";
        result.time_step = bytes[1];
        result.index = (bytes[2] << 24) + (bytes[3] << 16) + (bytes[4] << 8) + bytes[5];
        var n = 0;
        for (var i = 6; i + 1 < bytes.length; i += 2) {
            n++;
            result["index_energy_increment_t" + (n - 1)] = (bytes[i] << 8) + bytes[i + 1];
        }
    }
    // T2: nc_1mn service
    else if (header === 0x51) {
        result.message_type = "service";
        result.number_of_starts = bytes[1];
        result.param_id = bytes[3];
        result.firmware_version = (bytes[4] >> 2).toString();
        result.meter_type = ((bytes[4] >> 1) & 1) ? "elec" : "e-mech";
        result.battery_status = (bytes[4] & 1) ? "low" : "ok";
        result.index = (bytes[5] << 24) + (bytes[6] << 16) + (bytes[7] << 8) + bytes[8];
    }
    // T2: nc_10/15/60-min service
    else if (header === 0x0E) {
        result.message_type = "service";
        result.number_of_starts = bytes[1];
        result.param_id = bytes[3];
        result.firmware_version = (bytes[4] >> 2).toString();
        result.meter_type = ((bytes[4] >> 1) & 1) ? "elec" : "e-mech";
        result.battery_status = (bytes[4] & 1) ? "low" : "ok";
        result.index = (bytes[5] << 24) + (bytes[6] << 16) + (bytes[7] << 8) + bytes[8];
        result.max_power = (bytes[9] << 8) + bytes[10];
        var ts = bytes[11];
        result.time_step = ts === 0x00 ? 10 : ts === 0x03 ? 15 : ts === 0x01 ? 60 : ts;
    }
    // T2: AP service
    else if (header === 0x6A) {
        result.message_type = "ap_service";
        result.number_of_starts = bytes[1];
        result.param_id = bytes[4];
        result.firmware_version = bytes[5].toString();
        result.meter_type = bytes[6] === 0 ? "e-mech" : bytes[6] === 1 ? "elec" : "e-mech-red";
        result.battery_status = bytes[7] === 0 ? "ok" : "low";
        result.index = (bytes[8] << 24) + (bytes[9] << 16) + (bytes[10] << 8) + bytes[11];
        result.time_step = bytes[12];
        result.number_of_values = bytes[13];
        result.redundancy = bytes[14] === 0x01;
        result.sensitivity = bytes[15];
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
