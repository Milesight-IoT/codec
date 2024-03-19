/**
 * Payload Encoder for Milesight Network Server
 *
 * Copyright 2024 Milesight IoT
 *
 * @product UC300
 */
function Encode(fPort, obj) {
    var encoded = milesightDeviceEncoder(obj);
    return encoded;
}

function milesightDeviceEncoder(payload) {
    var encoded = [];

    if ("reboot" in payload) {
        encoded = encoded.concat(reboot(payload.reboot));
    }
    if ("report_status" in payload) {
        encoded = encoded.concat(reportStatus(payload.report_status));
    }
    if ("report_interval" in payload) {
        encoded = encoded.concat(setReportInterval(payload.report_interval));
    }
    if ("collection_interval" in payload) {
        encoded = encoded.concat(setCollectionInterval(payload.collection_interval));
    }
    if ("timestamp" in payload) {
        encoded = encoded.concat(setTime(payload.timestamp));
    }
    if ("timezone" in payload) {
        encoded = encoded.concat(setTimeZone(payload.timezone));
    }
    if ("sync_time" in payload) {
        encoded = encoded.concat(syncTime(payload.sync_time));
    }
    if ("sniffer_config" in payload) {
        encoded = encoded.concat(setSniffer(payload.sniffer_config.channel_id, payload.sniffer_config.sniffer_interval));
    }
    if ("gpio_output_1" in payload) {
        if ("gpio_output_1_time" in payload) {
            encoded = encoded.concat(setGpio1WithTime(payload.gpio_output_1, payload.gpio_output_1_time));
        } else {
            encoded = encoded.concat(setGpio1(payload.gpio_output_1));
        }
    }
    if ("gpio_output_2" in payload) {
        if ("gpio_output_2_time" in payload) {
            encoded = encoded.concat(setGpio2WithTime(payload.gpio_output_2, payload.gpio_output_2_time));
        } else {
            encoded = encoded.concat(setGpio2(payload.gpio_output_2));
        }
    }

    return encoded;
}

/**
 * reboot
 * @param {boolean} reboot
 * @example payload: { "reboot": 1 }, output: FF10FF
 */
function reboot(reboot) {
    var reboot_values = [0, 1];
    if (reboot_values.indexOf(reboot) === -1) {
        throw new Error("reboot must be 0 or 1");
    }

    if (reboot === 0) {
        return [];
    }
    return [0xff, 0x10, 0xff];
}

/**
 * request device report status ( such as: peridioc report)
 * @param {boolean} report_status
 * @example payload: { "report_status": true }, output: FF28FF
 */
function reportStatus(report_status) {
    var report_status_values = [0, 1];
    if (report_status_values.indexOf(report_status) === -1) {
        throw new Error("report_status must be 0 or 1");
    }

    if (report_status === 0) {
        return [];
    }
    return [0xff, 0x94, 0xff];
}

/**
 * sync time
 * @example payload: { "sync_time": true }, output: FF4AFF
 */
function syncTime(sync_time) {
    var sync_time_values = [0, 1];
    if (sync_time_values.indexOf(sync_time) === -1) {
        throw new Error("sync_time must be 0 or 1");
    }

    if (sync_time === 0) {
        return [];
    }
    return [0xff, 0x4a, 0xff];
}

/**
 * @param {number} timestamp unit: second
 */
function setTime(timestamp) {
    if (typeof timestamp !== "number") {
        throw new Error("timestamp must be a number");
    }
    var buffer = new Buffer(6);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x11);
    buffer.writeUInt32LE(timestamp);
    return buffer.toBytes();
}

/**
 * time zone configuration
 * @param {number} timezone range: [-12, 12]
 * @example payload: { "timezone": -4 }, output: FF17D8FF
 * @example payload: { "timezone": 8 }, output: FF175000
 */
function setTimeZone(timezone) {
    if (typeof timezone !== "number") {
        throw new Error("timezone must be a number");
    }
    if (timezone < -12 || timezone > 12) {
        throw new Error("timezone must be between -12 and 12");
    }

    var buffer = new Buffer(4);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x17);
    buffer.writeInt16LE(timezone * 10);
    return buffer.toBytes();
}

/**
 * @param {number} collection_interval unit: second
 */
function setCollectionInterval(collection_interval) {
    if (typeof collection_interval !== "number") {
        throw new Error("collection_interval must be a number");
    }

    var buffer = new Buffer(4);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x02);
    buffer.writeUInt16LE(collection_interval);
    return buffer.toBytes();
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

/**
 * sniffer configuration
 * @param {number} channel_id
 * @param {*} sniffer_interval unit: ms
 */
function setSniffer(channel_id, sniffer_interval) {
    if (typeof channel_id !== "number") {
        throw new Error("sniffer_config.channel_id must be a number");
    }
    if (typeof sniffer_interval !== "number") {
        throw new Error("sniffer_config.sniffer_interval must be a number");
    }

    var buffer = new Buffer(5);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x91);
    buffer.writeUInt8(channel_id);
    buffer.writeUInt32LE(sniffer_interval);
    return buffer.toBytes();
}

function setGpio1(gpio_output_1) {
    var gpio_values = [0, 1];
    if (gpio_values.indexOf(gpio_output_1) === -1) {
        throw new Error("gpio_output_1 must be 0 or 1");
    }

    var buffer = new Buffer(3);
    buffer.writeUInt8(0x07);
    buffer.writeUInt8(gpio_output_1);
    buffer.writeUInt8(0xff);
    return buffer.toBytes();
}

function setGpio1WithTime(gpio_output_1, gpio_output_1_time) {
    var buffer = new Buffer(6);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x93);
    buffer.writeUInt8(0x01);
    buffer.writeUInt8(gpio_output_1);
    buffer.writeUInt32LE(gpio_output_1_time);
    return buffer.toBytes();
}

function setGpio2(gpio_output_2) {
    var gpio_values = [0, 1];
    if (gpio_values.indexOf(gpio_output_2) === -1) {
        throw new Error("gpio_output_2 must be 0 or 1");
    }

    var buffer = new Buffer(3);
    buffer.writeUInt8(0x08);
    buffer.writeUInt8(gpio_output_2);
    buffer.writeUInt8(0xff);
    return buffer.toBytes();
}

function setGpio2WithTime(gpio_output_2, gpio_output_2_time) {
    var buffer = new Buffer(6);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x93);
    buffer.writeUInt8(0x02);
    buffer.writeUInt8(gpio_output_2);
    buffer.writeUInt32LE(gpio_output_2_time);
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
