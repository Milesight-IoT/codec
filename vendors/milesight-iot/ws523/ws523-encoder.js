/**
 * Payload Encoder for Milesight Network Server
 *
 * Copyright 2024 Milesight IoT
 *
 * @product WS52x
 */
function Encode(fPort, obj) {
    var encoded = milesightDeviceEncoder(obj);
    return encoded;
}

function milesightDeviceEncoder(payload) {
    var encoded = [];

    if ("socket_status" in payload) {
        if ("delay_time" in payload) {
            encoded = encoded.concat(socketStatusWithDelay(payload.socket_status, payload.delay_time));
        } else {
            encoded = encoded.concat(socketStatus(payload.socket_status));
        }
    }
    if ("report_status" in payload) {
        encoded = encoded.concat(reportStatus(payload.report_status));
    }
    if ("report_attribute" in payload) {
        encoded = encoded.concat(reportAttribute(payload.report_attribute));
    }
    if ("report_interval" in payload) {
        encoded = encoded.concat(setReportInterval(payload.report_interval));
    }
    if ("cancel_delay" in payload) {
        encoded = encoded.concat(cancelDelayTask(payload.cancel_delay));
    }
    if ("overcurrent_protection" in payload) {
        encoded = encoded.concat(setOvercurrentProtection(payload.overcurrent_protection.enable, payload.overcurrent_protection.trip_current));
    }
    if ("current_threshold" in payload) {
        encoded = encoded.concat(setCurrentThreshold(payload.current_threshold.enable, payload.current_threshold.threshold));
    }
    if ("child_lock_config" in payload) {
        encoded = encoded.concat(setChildLock(payload.child_lock_config.enable, payload.child_lock_config.lock_time));
    }
    if ("power_consumption_enable" in payload) {
        encoded = encoded.concat(powerConsumptionEnable(payload.power_consumption_enable));
    }
    if ("reset_power_consumption" in payload) {
        encoded = encoded.concat(resetPowerConsumption(payload.reset_power_consumption));
    }
    if ("led_enable" in payload) {
        encoded = encoded.concat(setLedEnable(payload.led_enable));
    }

    return encoded;
}

/**
 * control socket status
 * @param {string} socket_status values: (0: "off", 1: "on")
 */
function socketStatus(socket_status) {
    var status_values = [0, 1];
    if (status_values.indexOf(socket_status) === -1) {
        throw new Error("socket_status must be one of " + status_values.join(", "));
    }

    var buffer = new Buffer(3);
    buffer.writeUInt8(0x08);
    buffer.writeUInt8(status_values.indexOf(socket_status));
    buffer.writeUInt16LE(0xffff);
    return buffer.toBytes();
}

/**
 * @param {boolean} report_status
 * @example payload: { "report_status": true }, output: FF28FF
 */
function reportStatus(report_status) {
    var report_status_values = [0, 1];
    if (report_status_values.indexOf(report_status) === -1) {
        throw new Error("report_status must be one of " + report_status_values.join(", "));
    }

    if (report_status === 0) {
        return [];
    }
    return [0xff, 0x28, 0xff];
}

/**
 * @param {boolean} report_attribute
 */
function reportAttribute(report_attribute) {
    var report_attribute_values = [0, 1];
    if (report_attribute_values.indexOf(report_attribute) === -1) {
        throw new Error("report_attribute must be one of " + report_attribute_values.join(", "));
    }

    if (report_attribute === 0) {
        return [];
    }
    return [0xff, 0x2c, 0xff];
}

/**
 * report interval configuration
 * @param {number} report_interval uint: second
 * @example payload: { "report_interval": 600 }
 */
function setReportInterval(report_interval) {
    if (typeof report_interval !== "number") {
        throw new Error("report_interval must be a number");
    }
    if (report_interval < 1) {
        throw new Error("report_interval must be greater than 1");
    }

    var buffer = new Buffer(4);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x03);
    buffer.writeUInt16LE(report_interval);
    return buffer.toBytes();
}

function socketStatusWithDelay(socket_status, delay_time) {
    var socket_status_values = [0, 1];
    if (socket_status_values.indexOf(socket_status) === -1) {
        throw new Error("socket_status must be one of " + socket_status_values.join(", "));
    }
    if (typeof delay_time !== "number") {
        throw new Error("delay_time must be a number");
    }

    var data = (0x01 << 4) + socket_status_values.indexOf(socket_status);
    var buffer = new Buffer(6);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x22);
    buffer.writeUInt8(0x00);
    buffer.writeUInt16LE(delay_time);
    buffer.writeUInt8(data);
    return buffer.toBytes();
}

/**
 * @param {number} cancel_delay_task
 */
function cancelDelayTask(cancel_delay_task) {
    if (typeof cancel_delay_task !== "number") {
        throw new Error("cancel_delay_task must be a number");
    }

    var buffer = new Buffer(4);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x23);
    buffer.writeUInt8(0x00);
    buffer.writeUInt8(0xff);
    return buffer.toBytes();
}

/**
 * set overcurrent protection configuration
 * @param {boolean} enable values: (0: disable, 1: enable)
 * @param {number} trip_current unit: A
 */
function setOvercurrentProtection(enable, trip_current) {
    var overcurrent_enable_values = [0, 1];
    if (overcurrent_enable_values.indexOf(enable) === -1) {
        throw new Error("overcurrent_threshold.enable must be one of " + overcurrent_enable_values.join(", "));
    }
    if (typeof trip_current !== "number") {
        throw new Error("overcurrent_threshold.trip_current must be a number");
    }

    var buffer = new Buffer(4);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x30);
    buffer.writeUInt8(overcurrent_enable_values.indexOf(enable));
    buffer.writeUInt8(trip_current);
    return buffer.toBytes();
}

/**
 * set current threshold configuration
 * @param {boolean} enable values: (0: disable, 1: enable)
 * @param {number} threshold unit: A
 */
function setCurrentThreshold(enable, threshold) {
    var current_threshold_enable_values = [0, 1];
    if (current_threshold_enable_values.indexOf(enable) === -1) {
        throw new Error("current_threshold.enable must be one of " + current_threshold_enable_values.join(", "));
    }
    if (typeof threshold !== "number") {
        throw new Error("current_threshold.threshold must be a number");
    }

    var buffer = new Buffer(4);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x24);
    buffer.writeUInt8(current_threshold_enable_values.indexOf(enable));
    buffer.writeUInt8(threshold);
    return buffer.toBytes();
}

/**
 * set child lock configuration
 * @param {boolean} enable values: (0: disable, 1: enable)
 * @param {number} lock_time unit: min
 */
function setChildLock(enable, lock_time) {
    var button_lock_enable_values = [0, 1];
    if (button_lock_enable_values.indexOf(enable) === -1) {
        throw new Error("child_lock_config.enable must be one of " + button_lock_enable_values.join(", "));
    }
    if (typeof lock_time !== "number") {
        throw new Error("child_lock_config.lock_time must be a number");
    }

    var data = button_lock_enable_values.indexOf(enable);
    data = (data << 15) + lock_time;
    var buffer = new Buffer(4);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x25);
    buffer.writeUInt16LE(data);
    return buffer.toBytes();
}

/**
 * set statistics enable configuration
 * @param {boolean} power_consumption_enable values: (0: disable, 1: enable)
 */
function powerConsumptionEnable(power_consumption_enable) {
    var power_consumption_values = [0, 1];
    if (power_consumption_values.indexOf(power_consumption_enable) === -1) {
        throw new Error("power_consumption_enable must be one of " + power_consumption_values.join(", "));
    }

    var buffer = new Buffer(3);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x26);
    buffer.writeUInt8(power_consumption_values.indexOf(power_consumption_enable));
    return buffer.toBytes();
}

/**
 * reset power consumption
 * @param {boolean} reset_power_consumption values: (0: disable, 1: enable)
 */
function resetPowerConsumption(reset_power_consumption) {
    var reset_power_consumption_values = [0, 1];
    if (reset_power_consumption_values.indexOf(reset_power_consumption) === -1) {
        throw new Error("reset_power_consumption must be one of " + reset_power_consumption_values.join(", "));
    }

    if (reset_power_consumption === 0) {
        return [];
    }
    return [0xff, 0x27, 0xff];
}

/**
 * set led enable configuration
 * @param {boolean} led_enable values: (0: disable, 1: enable)
 */
function setLedEnable(led_enable) {
    var led_enable_values = [0, 1];
    if (led_enable_values.indexOf(led_enable) === -1) {
        throw new Error("led_enable must be one of " + led_enable_values.join(", "));
    }

    var buffer = new Buffer(3);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x2f);
    buffer.writeUInt8(led_enable_values.indexOf(led_enable));
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
    this._write(value, 1, true);
    this.offset += 1;
};

Buffer.prototype.writeInt8 = function (value) {
    this._write(value < 0 ? value + 0x100 : value, 1, true);
    this.offset += 1;
};

Buffer.prototype.writeUInt16LE = function (value) {
    this._write(value, 2, true);
    this.offset += 2;
};

Buffer.prototype.writeInt16LE = function (value) {
    this._write(value < 0 ? value + 0x10000 : value, 2, true);
    this.offset += 2;
};

Buffer.prototype.writeUInt32LE = function (value) {
    this._write(value, 4, true);
    this.offset += 4;
};

Buffer.prototype.writeInt32LE = function (value) {
    this._write(value < 0 ? value + 0x100000000 : value, 4, true);
    this.offset += 4;
};

Buffer.prototype.toBytes = function () {
    return this.buffer;
};
