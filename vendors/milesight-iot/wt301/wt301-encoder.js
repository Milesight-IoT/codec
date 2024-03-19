/**
 * Payload Encoder for Milesight Network Server
 *
 * Copyright 2024 Milesight IoT
 *
 * @product WT301
 */

// Chirpstack v3
function Encode(fPort, obj) {
    var encoded = milesightDeviceEncoder(obj);
    return encoded;
}

// Chirpstack v4
function encodeDownlink(input) {
    var encoded = milesightDeviceEncoder(input.data);
    return encoded;
}

// The Things Network
function Encoder(obj, port) {
    return milesightDeviceEncoder(obj);
}

function milesightDeviceEncoder(payload) {
    var encoded = [];

    if ("thermostat_status" in payload && "btn_lock_enable" in payload && "mode" in payload && "fan_speed" in payload && "temperature_target" in payload && "control_mode" in payload && "server_temperature" in payload) {
        encoded = encoded.concat(setAll(payload.thermostat_status, payload.btn_lock_enable, payload.mode, payload.fan_speed, payload.temperature_target, payload.control_mode, payload.server_temperature));
    } else {
        if ("thermostat_status" in payload) {
            encoded = encoded.concat(setThermostatStatus(payload.thermostat_status));
        }
        if ("btn_lock_enable" in payload) {
            encoded = encoded.concat(setButtonLockEnable(payload.btn_lock_enable));
        }
        if ("mode" in payload) {
            encoded = encoded.concat(setSystemMode(payload.mode));
        }
        if ("fan_speed" in payload) {
            encoded = encoded.concat(setFanSpeed(payload.fan_speed));
        }
        if ("temperature_target" in payload) {
            encoded = encoded.concat(setTargetTemperature(payload.temperature_target));
        }
        if ("control_mode" in payload) {
            encoded = encoded.concat(setControlMode(payload.control_mode));
        }
        if ("server_temperature" in payload) {
            encoded = encoded.concat(setServerTemperature(payload.server_temperature));
        }

        if ("query_thermostat_status" in payload) {
            encoded = encoded.concat(queryThermostatStatus());
        }
        if ("query_button_lock_status" in payload) {
            encoded = encoded.concat(queryButtonLockEnable());
        }
        if ("query_mode" in payload) {
            encoded = encoded.concat(querySystemMode());
        }
        if ("query_fan_speed" in payload) {
            encoded = encoded.concat(queryFanSpeed());
        }
        if ("query_temperature" in payload) {
            encoded = encoded.concat(queryTemperature());
        }
        if ("query_target_temperature" in payload) {
            encoded = encoded.concat(queryTargetTemperature());
        }
        if ("query_card_mode" in payload) {
            encoded = encoded.concat(queryCardMode());
        }
        if ("query_control_mode" in payload) {
            encoded = encoded.concat(queryControlMode());
        }
        if ("query_server_temperature" in payload) {
            encoded = encoded.concat(queryServerTemperature());
        }
        if ("query_all" in payload) {
            encoded = encoded.concat(queryAll());
        }
    }

    return encoded;
}

/**
 * @param {number} thermostat_status values: (0: "off", 1: "on")
 * @example {"thermostat_status": 1}
 */
function setThermostatStatus(thermostat_status) {
    var thermostat_status_values = [0, 1];
    if (thermostat_status_values.indexOf(thermostat_status) === -1) {
        throw new Error("thermostat_status must be one of " + thermostat_status_values.join(", "));
    }

    var buffer = new Buffer(7);
    buffer.writeUInt8(0x55);
    buffer.writeUInt8(0x01);
    buffer.writeUInt16BE(0x0002);
    buffer.writeUInt8(0x01); // THERMOSTAT STATUS
    buffer.writeUInt8(thermostat_status_values.indexOf(thermostat_status));
    buffer.writeUInt8(buffer.checksum());
    return buffer.toBytes();
}

/**
 * @param {number} btn_lock_enable values: (0: "disable", 1: "enable")
 * @example {"btn_lock_enable": 1}
 */
function setButtonLockEnable(btn_lock_enable) {
    var btn_lock_enable_values = [0, 1]; // values: (0: "disable", 1: "enable")
    if (btn_lock_enable_values.indexOf(btn_lock_enable) === -1) {
        throw new Error("btn_lock_enable must be one of " + btn_lock_enable_values.join(", "));
    }

    var buffer = new Buffer(7);
    buffer.writeUInt8(0x55);
    buffer.writeUInt8(0x01);
    buffer.writeUInt16BE(0x0002);
    buffer.writeUInt8(0x02); // BUTTON LOCK
    buffer.writeUInt8(btn_lock_enable_values.indexOf(btn_lock_enable));
    buffer.writeUInt8(buffer.checksum());
    return buffer.toBytes();
}

/**
 * @param {number} mode values: (0: "cool", 1: "heat", 2: "fan")
 * @example {"mode": 0}
 */
function setSystemMode(mode) {
    var mode_values = [0, 1, 2];
    if (mode_values.indexOf(mode) === -1) {
        throw new Error("mode must be one of " + mode_values.join(", "));
    }

    var buffer = new Buffer(7);
    buffer.writeUInt8(0x55);
    buffer.writeUInt8(0x01);
    buffer.writeUInt16BE(0x0002);
    buffer.writeUInt8(0x03); // SYSTEM MODE
    buffer.writeUInt8(mode_values.indexOf(mode));
    buffer.writeUInt8(buffer.checksum());
    return buffer.toBytes();
}

/**
 * @param {number} fan_speed values: (0: "auto", 1: "high", 2: "medium", 3: "low")
 * @example {"fan_speed": 0}
 */
function setFanSpeed(fan_speed) {
    var fan_speed_values = [0, 1, 2, 3];
    if (fan_speed_values.indexOf(fan_speed) === -1) {
        throw new Error("fan_speed must be one of " + fan_speed_values.join(", "));
    }

    var buffer = new Buffer(7);
    buffer.writeUInt8(0x55);
    buffer.writeUInt8(0x01);
    buffer.writeUInt16BE(0x0002);
    buffer.writeUInt8(0x04); // FAN SPEED
    buffer.writeUInt8(fan_speed_values.indexOf(fan_speed));
    buffer.writeUInt8(buffer.checksum());
    return buffer.toBytes();
}

/**
 * @param {number} temperature temperature * 2
 * @example {"temperature_target": 20}
 */
function setTargetTemperature(temperature) {
    if (typeof temperature !== "number") {
        throw new Error("temperature must be a number");
    }

    var buffer = new Buffer(7);
    buffer.writeUInt8(0x55);
    buffer.writeUInt8(0x01);
    buffer.writeUInt16BE(0x0002);
    buffer.writeUInt8(0x05); // TARGET TEMPERATURE
    buffer.writeUInt8(temperature * 2);
    buffer.writeUInt8(buffer.checksum());
    return buffer.toBytes();
}

/**
 * @param {number} control_mode values: (0: "auto", 1: "manual")
 * @example {"control_mode": 0}
 */
function setControlMode(control_mode) {
    var control_mode_values = [0, 1];
    if (control_mode_values.indexOf(control_mode) === -1) {
        throw new Error("control_mode must be one of " + control_mode_values.join(", "));
    }

    var buffer = new Buffer(7);
    buffer.writeUInt8(0x55);
    buffer.writeUInt8(0x01);
    buffer.writeUInt16BE(0x0002);
    buffer.writeUInt8(0x06); // CONTROL MODE
    buffer.writeUInt8(control_mode_values.indexOf(control_mode));
    buffer.writeUInt8(buffer.checksum());
    return buffer.toBytes();
}

/**
 * @param {number} server_temperature temperature * 2
 * @example {"server_temperature": 20}
 */
function setServerTemperature(server_temperature) {
    if (typeof server_temperature !== "number") {
        throw new Error("server_temperature must be a number");
    }

    var buffer = new Buffer(7);
    buffer.writeUInt8(0x55);
    buffer.writeUInt8(0x01);
    buffer.writeUInt16BE(0x0002);
    buffer.writeUInt8(0x07); // SERVER TEMPERATURE
    buffer.writeUInt8(server_temperature * 2);
    buffer.writeUInt8(buffer.checksum());
    return buffer.toBytes();
}

/**
 *
 * @param {number} thermostat_status values: (0: "off", 1: "on")
 * @param {number} btn_lock_enable values: (0: "disable", 1: "enable")
 * @param {number} mode values: (0: "cool", 1: "heat", 2: "fan")
 * @param {number} fan_speed values: (0: "auto", 1: "high", 2: "medium", 3: "low")
 * @param {number} temperature_target temperature * 2
 * @param {number} control_mode values: (0: "auto", 1: "manual")
 * @param {number} server_temperature temperature * 2
 * @example {"thermostat_status": 1, "btn_lock_enable": 1, "mode": 0, "fan_speed": 0, "temperature_target": 20, "control_mode": 0, "server_temperature": 20}
 */
function setAll(thermostat_status, btn_lock_enable, mode, fan_speed, temperature_target, control_mode, server_temperature) {
    var thermostat_status_values = [0, 1];
    var btn_lock_enable_values = [0, 1];
    var mode_values = [0, 1, 2];
    var fan_speed_values = [0, 1, 2, 3];
    var control_mode_values = [0, 1];

    if (thermostat_status_values.indexOf(thermostat_status) === -1) {
        throw new Error("thermostat_status must be one of " + thermostat_status_values.join(", "));
    }
    if (btn_lock_enable_values.indexOf(btn_lock_enable) === -1) {
        throw new Error("btn_lock_enable must be one of " + btn_lock_enable_values.join(", "));
    }
    if (mode_values.indexOf(mode) === -1) {
        throw new Error("mode must be one of " + mode_values.join(", "));
    }
    if (fan_speed_values.indexOf(fan_speed) === -1) {
        throw new Error("fan_speed must be one of " + fan_speed_values.join(", "));
    }
    if (control_mode_values.indexOf(control_mode) === -1) {
        throw new Error("control_mode must be one of " + control_mode_values.join(", "));
    }

    var buffer = new Buffer(13);
    buffer.writeUInt8(0x55);
    buffer.writeUInt8(0x01);
    buffer.writeUInt16BE(0x0008);
    buffer.writeUInt8(0x0f); // ALL
    buffer.writeUInt8(thermostat_status_values.indexOf(thermostat_status));
    buffer.writeUInt8(btn_lock_enable_values.indexOf(btn_lock_enable));
    buffer.writeUInt8(mode_values.indexOf(mode));
    buffer.writeUInt8(fan_speed_values.indexOf(fan_speed));
    buffer.writeUInt8(temperature_target * 2);
    buffer.writeUInt8(control_mode_values.indexOf(control_mode));
    buffer.writeUInt8(server_temperature * 2);
    buffer.writeUInt8(buffer.checksum());
    return buffer.toBytes();
}

/**
 *
 * @example {"query_thermostat_status": 1}
 */
function queryThermostatStatus() {
    var buffer = new Buffer(6);
    buffer.writeUInt8(0x55);
    buffer.writeUInt8(0x02);
    buffer.writeUInt16BE(0x0001);
    buffer.writeUInt8(0x01); // THERMOSTAT STATUS
    buffer.writeUInt8(buffer.checksum());
    return buffer.toBytes();
}

/**
 *
 * @example {"query_button_lock_status": 1}
 */
function queryButtonLockEnable() {
    var buffer = new Buffer(6);
    buffer.writeUInt8(0x55);
    buffer.writeUInt8(0x02);
    buffer.writeUInt16BE(0x0001);
    buffer.writeUInt8(0x02); // BUTTON LOCK
    buffer.writeUInt8(buffer.checksum());
    return buffer.toBytes();
}

/**
 *
 * @example {"query_mode": 1}
 */
function querySystemMode() {
    var buffer = new Buffer(6);
    buffer.writeUInt8(0x55);
    buffer.writeUInt8(0x02);
    buffer.writeUInt16BE(0x0001);
    buffer.writeUInt8(0x03); // SYSTEM MODE
    buffer.writeUInt8(buffer.checksum());
    return buffer.toBytes();
}

/**
 *
 * @example {"query_fan_speed": 1}
 */
function queryFanSpeed() {
    var buffer = new Buffer(6);
    buffer.writeUInt8(0x55);
    buffer.writeUInt8(0x02);
    buffer.writeUInt16BE(0x0001);
    buffer.writeUInt8(0x04); // FAN SPEED
    buffer.writeUInt8(buffer.checksum());
    return buffer.toBytes();
}

/**
 *
 * @example {"query_temperature": 1}
 */
function queryTemperature() {
    var buffer = new Buffer(6);
    buffer.writeUInt8(0x55);
    buffer.writeUInt8(0x02);
    buffer.writeUInt16BE(0x0001);
    buffer.writeUInt8(0x05); // TEMPERATURE
    buffer.writeUInt8(buffer.checksum());
    return buffer.toBytes();
}

/**
 *
 * @example {"query_target_temperature": 1}
 */
function queryTargetTemperature() {
    var buffer = new Buffer(6);
    buffer.writeUInt8(0x55);
    buffer.writeUInt8(0x02);
    buffer.writeUInt16BE(0x0001);
    buffer.writeUInt8(0x06); // TARGET TEMPERATURE
    buffer.writeUInt8(buffer.checksum());
    return buffer.toBytes();
}

/**
 *
 * @example {"query_card_mode": 1}
 */
function queryCardMode() {
    var buffer = new Buffer(6);
    buffer.writeUInt8(0x55);
    buffer.writeUInt8(0x02);
    buffer.writeUInt16BE(0x0001);
    buffer.writeUInt8(0x07); // CARD MODE
    buffer.writeUInt8(buffer.checksum());
    return buffer.toBytes();
}

/**
 *
 * @example {"query_control_mode": 1}
 */
function queryControlMode() {
    var buffer = new Buffer(6);
    buffer.writeUInt8(0x55);
    buffer.writeUInt8(0x02);
    buffer.writeUInt16BE(0x0001);
    buffer.writeUInt8(0x08); // CONTROL MODE
    buffer.writeUInt8(buffer.checksum());
    return buffer.toBytes();
}

/**
 *
 * @example {"query_server_temperature": 1}
 */
function queryServerTemperature() {
    var buffer = new Buffer(6);
    buffer.writeUInt8(0x55);
    buffer.writeUInt8(0x02);
    buffer.writeUInt16BE(0x0001);
    buffer.writeUInt8(0x09); // SERVER TEMPERATURE
    buffer.writeUInt8(buffer.checksum());
    return buffer.toBytes();
}

/**
 *
 * @example {"query_all": 1}
 */
function queryAll() {
    var buffer = new Buffer(6);
    buffer.writeUInt8(0x55);
    buffer.writeUInt8(0x02);
    buffer.writeUInt16BE(0x0001);
    buffer.writeUInt8(0x0f); // ALL
    buffer.writeUInt8(buffer.checksum());
    return buffer.toBytes();
}

function Buffer(size) {
    this.buffer = new Array(size);
    this.offset = 0;

    for (var i = 0; i < size; i++) {
        this.buffer[i] = 0;
    }
}

Buffer.prototype._write = function (value, byteLength, isLittleEndian) {
    for (var index = 0; index < byteLength; index++) {
        var shift = isLittleEndian ? index << 3 : (byteLength - 1 - index) << 3;
        this.buffer[this.offset + index] = (value & (0xff << shift)) >> shift;
    }
};

Buffer.prototype.writeUInt8 = function (value) {
    this._write(value, 1, false);
    this.offset += 1;
};

Buffer.prototype.writeInt8 = function (value) {
    this._write(value < 0 ? value + 0x100 : value, 1, false);
    this.offset += 1;
};

Buffer.prototype.writeUInt16BE = function (value) {
    this._write(value, 2, false);
    this.offset += 2;
};

Buffer.prototype.writeInt16BE = function (value) {
    this._write(value < 0 ? value + 0x10000 : value, 2, false);
    this.offset += 2;
};

Buffer.prototype.writeUInt32BE = function (value) {
    this._write(value, 4, false);
    this.offset += 4;
};

Buffer.prototype.writeInt32LE = function (value) {
    this._write(value < 0 ? value + 0x100000000 : value, 4, false);
    this.offset += 4;
};

Buffer.prototype.checksum = function () {
    var crc = 0;
    for (var i = 0; i < this.offset; i++) {
        crc += this.buffer[i];
    }
    return crc & 0xff;
};

Buffer.prototype.toBytes = function () {
    return this.buffer;
};
