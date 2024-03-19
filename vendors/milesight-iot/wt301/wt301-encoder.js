/**
 * Payload Encoder for Milesight Network Server
 *
 * Copyright 2024 Milesight IoT
 *
 * @product WT301
 */
function Encode(fPort, obj) {
    var encoded = milesightDeviceEncoder(obj);
    return encoded;
}

function milesightDeviceEncoder(payload) {
    var encoded = [];

    if ("thermostat_status" in payload && "btn_lock_enable" in payload && "mode" in payload && "fan_speed" in payload && "temperature_target" in payload && "control_mode" in payload && "server_temperature" in payload) {
        encoded = encoded.concat(setAll(payload.thermostat_status, payload.btn_lock_enable, payload.mode, payload.fan_speed, payload.temperature_target, payload.control_mode, payload.server_temperature));
    } else {
        // input: { thermostat_status: "on" }
        // output: [ 85, 1, 0, 2, 1, 1, 90 ]
        if ("thermostat_status" in payload) {
            encoded = encoded.concat(setThermostatStatus(payload.thermostat_status));
        }
        // input: { btn_lock_enable: "disable" }
        // output: [ 85, 1, 0, 2, 2, 0, 90 ]
        if ("btn_lock_enable" in payload) {
            encoded = encoded.concat(setButtonLockEnable(payload.btn_lock_enable));
        }
        // input: { mode: "cool" }
        // output: [ 85, 1, 0, 2, 3, 0, 91 ]
        if ("mode" in payload) {
            encoded = encoded.concat(setSystemMode(payload.mode));
        }
        // input: { fan_speed: "high" }
        // output: [ 85, 1, 0, 2, 4, 1, 93 ]
        if ("fan_speed" in payload) {
            encoded = encoded.concat(setFanSpeed(payload.fan_speed));
        }
        // input: { temperature_target: 21 }
        // output: [ 85, 1, 0, 2, 5, 42, 135 ]
        if ("temperature_target" in payload) {
            encoded = encoded.concat(setTargetTemperature(payload.temperature_target));
        }
        // input: { control_mode: "auto" }
        // output: [ 85, 1, 0, 2, 8, 0, 96 ]
        if ("control_mode" in payload) {
            encoded = encoded.concat(setControlMode(payload.control_mode));
        }
        // input: { server_temperature: 26 }
        // output: [ 85, 1, 0, 2, 9, 52, 149 ]
        if ("server_temperature" in payload) {
            encoded = encoded.concat(setServerTemperature(payload.server_temperature));
        }
    }

    return encoded;
}

var thermostat_status_values = [0, 1]; // values: (0: "off", 1: "on")
var btn_lock_enable_values = [0, 1]; // values: (0: "disable", 1: "enable")
var mode_values = [0, 1, 2]; // values: (0: "cool", 1: "heat", 2: "fan")
var fan_speed_values = [0, 1, 2, 3]; // values: (0: "auto", 1: "high", 2: "medium", 3: "low")
var control_mode_values = [0, 1]; // values: (0: "auto", 1: "manual")

/**
 * @param {string} thermostat_status values: (0: "off", 1: "on")
 * @returns {Array}
 */
function setThermostatStatus(thermostat_status) {
    if (thermostat_status_values.includes(thermostat_status) === -1) {
        throw new Error("thermostat_status must be one of" + thermostat_status_values.join(", "));
    }

    var buffer = new Buffer(7);
    buffer.writeUInt8(0x55);
    buffer.writeUInt8(0x01);
    buffer.writeUInt16BE(0x0002);
    buffer.writeUInt8(0x01); // THERMOSTAT STATUS
    buffer.writeUInt8(thermostat_status_values.includes(thermostat_status));
    buffer.writeUInt8(buffer.checksum());
    return buffer.toBytes();
}

/**
 * @param {string} btn_lock_enable values: (0: "disable", 1: "enable")
 * @returns {Array}
 */
function setButtonLockEnable(btn_lock_enable) {
    if (btn_lock_enable_values.includes(btn_lock_enable) === -1) {
        throw new Error("btn_lock_enable must be one of" + btn_lock_enable_values.join(", "));
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
 * @param {string} mode values: (0: "cool", 1: "heat", 2: "fan")
 * @returns {Array}
 */
function setSystemMode(mode) {
    if (mode_values.includes(mode) === -1) {
        throw new Error("mode must be one of" + mode_values.join(", "));
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
 * @param {string} fan_speed values: (0: "auto", 1: "high", 2: "medium", 3: "low")
 * @returns {Array}
 */
function setFanSpeed(fan_speed) {
    if (fan_speed_values.includes(fan_speed) === -1) {
        throw new Error("fan_speed must be one of" + fan_speed_values.join(", "));
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
 * @returns {Array}
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
 * @param {string} control_mode values: (0: "auto", 1: "manual")
 * @returns {Array}
 */
function setControlMode(control_mode) {
    if (control_mode_values.includes(control_mode) === -1) {
        throw new Error("control_mode must be one of" + control_mode_values.join(", "));
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
 * @returns {Array}
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
 * @param {string} thermostat_status values: (0: "off", 1: "on")
 * @param {string} btn_lock_enable values: (0: "disable", 1: "enable")
 * @param {string } mode values: (0: "cool", 1: "heat", 2: "fan")
 * @param {string} fan_speed values: (0: "auto", 1: "high", 2: "medium", 3: "low")
 * @param {number} temperature_target temperature * 2
 * @param {string} control_mode values: (0: "auto", 1: "manual")
 * @param {number} server_temperature temperature * 2
 * @returns {Array}
 */
function setAll(thermostat_status, btn_lock_enable, mode, fan_speed, temperature_target, control_mode, server_temperature) {
    if (thermostat_status_values.includes(thermostat_status) === -1) {
        throw new Error("thermostat_status must be one of" + thermostat_status_values.join(", "));
    }
    if (btn_lock_enable_values.includes(btn_lock_enable) === -1) {
        throw new Error("btn_lock_enable must be one of" + btn_lock_enable_values.join(", "));
    }
    if (mode_values.includes(mode) === -1) {
        throw new Error("mode must be one of" + mode_values.join(", "));
    }
    if (fan_speed_values.includes(fan_speed) === -1) {
        throw new Error("fan_speed must be one of" + fan_speed_values.join(", "));
    }
    if (control_mode_values.includes(control_mode) === -1) {
        throw new Error("control_mode must be one of" + control_mode_values.join(", "));
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
