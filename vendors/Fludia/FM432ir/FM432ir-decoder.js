/**
 * FM432ir decoder — LoRaWAN IoT electricity sensor (German meters, IR/SML)
 * T1: mME 1-min (0xF02E/0xF02F/0xF030) → 8B index + variable increments
 * T1: mME AP (0x71-0x74) → time_step + 8B index + variable increments
 * T1: electromechanical AP (0x6F) → time_step + 4B index + variable increments
 * T2: mME AP (0xF03A) → time_step, number_of_values, redundancy, obis, firmware, sensitivity, battery, scalers, 8B index
 * T2: MECA AP (0x70) → number_of_starts, param_id, firmware, meter_type, battery, 4B index, time_step, number_of_values, redundancy, sensitivity
 * Ref: User_Guide_FM432-MAN432_EN_v1_2_4.pdf + Fludia official decoder
 */
function decode(bytes) {
    if (!bytes || bytes.length === 0) return {};

    var header = bytes[0];
    var header16 = bytes.length >= 2 ? (bytes[0] << 8) | bytes[1] : bytes[0];
    var result = { message_type: "unknown" };

    // T1: mME 1-min (3-byte header: 0xF02E/0xF02F/0xF030)
    if (header16 === 0xF02E || header16 === 0xF02F || header16 === 0xF030) {
        result.message_type = "mme_1min";
        if (header16 === 0xF02E) result.obis_type = "E-SUM";
        else if (header16 === 0xF02F) result.obis_type = "E-POS";
        else result.obis_type = "E-NEG";
        result.time_step = 1;
        var idx = (bytes[2] << 24) + (bytes[3] << 16) + (bytes[4] << 8) + bytes[5];
        result.index_energy_value = idx;
        for (var i = 0; i < 15; i++) {
            var val = (bytes[6 + i * 2] << 8) + bytes[6 + i * 2 + 1];
            result["index_energy_increment_t" + i] = val;
        }
    }
    // T1: electromechanical AP (0x6F)
    else if (header === 0x6F) {
        result.message_type = "electromechanical";
        result.time_step = bytes[1];
        result.index_energy_value = (bytes[2] << 24) + (bytes[3] << 16) + (bytes[4] << 8) + bytes[5];
        var n = 0;
        for (var i = 6; i + 1 < bytes.length; i += 2) {
            n++;
            result["index_energy_increment_t" + (n - 1)] = (bytes[i] << 8) + bytes[i + 1];
        }
    }
    // T1: mME AP (0x71-0x74)
    else if (header === 0x71 || header === 0x72 || header === 0x73 || header === 0x74) {
        result.message_type = "mme_ap";
        if (header === 0x71) result.obis_type = "E-SUM";
        else if (header === 0x72) result.obis_type = "E-POS";
        else if (header === 0x73) result.obis_type = "E-NEG";
        else result.obis_type = "E-POS+E-NEG";
        result.time_step = bytes[1];
        var idx = 0;
        for (var bi = 3; bi <= 10; bi++) idx = idx * 256 + bytes[bi];
        result.index_energy_value = idx / 10;
        var n = 0;
        for (var i = 11; i + 1 < bytes.length; i += 2) {
            n++;
            result["index_energy_increment_t" + (n - 1)] = ((bytes[i] << 8) + bytes[i + 1]) / 10;
        }
    }
    // T2: mME AP service (0xF03A)
    else if (header16 === 0xF03A) {
        result.message_type = "mme_service";
        result.time_step = bytes[2];
        result.number_of_values = bytes[3];
        result.redundancy = bytes[4] === 0x01;
        var typeByte = bytes[5];
        result.obis_type = typeByte === 0x00 ? "E-POS" : typeByte === 0x01 ? "E-SUM" : typeByte === 0x02 ? "E-NEG" : "E-POS+E-NEG";
        result.firmware_version = bytes[7].toString();
        result.sensitivity = bytes[8];
        result.battery_status = (bytes[9] & 1) ? "low" : "ok";
        // Scalers: signed int8, then 10^x
        result.scaler_e_pos = toSignedInt8(bytes[10]);
        result.scaler_e_sum = toSignedInt8(bytes[11]);
        result.scaler_e_neg = toSignedInt8(bytes[12]);
        // 8-byte index
        result.index_energy_value = 0;
        for (var bi = 13; bi <= 20; bi++) result.index_energy_value = result.index_energy_value * 256 + bytes[bi];
        result.index_energy_value = result.index_energy_value / 10;
    }
    // T2: electromechanical service (0x70)
    else if (header === 0x70) {
        result.message_type = "electromechanical_service";
        result.number_of_starts = bytes[1];
        result.param_id = bytes[4];
        result.firmware_version = bytes[5].toString();
        result.meter_type = bytes[6] === 0 ? "e-mech" : "elec";
        result.battery_status = bytes[7] === 0 ? "ok" : "low";
        result.index_energy_value = (bytes[8] << 24) + (bytes[9] << 16) + (bytes[10] << 8) + bytes[11];
        result.time_step = bytes[12];
        result.number_of_values = bytes[13];
        result.redundancy = bytes[14] === 0x01;
        result.sensitivity = bytes[15];
    }

    return result;
}

function toSignedInt8(b) {
    return b & 0x80 ? b - 0x100 : b;
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
