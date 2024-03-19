/**
 * Payload Encoder for Milesight Network Server
 *
 * Copyright 2024 Milesight IoT
 *
 * @product UC100
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
    if ("report_interval" in payload) {
        encoded = encoded.concat(setReportInterval(payload.report_interval));
    }
    if ("modbus_config" in payload) {
        encoded = encoded.concat(modbusChannelConfig(payload.modbus_config));
    }

    return encoded;
}

/**
 * device reboot
 * @param {boolean} reboot values: (0: false, 1: true)
 * @example payload: { "reboot": 1 }, output: FF10FF
 */
function reboot(reboot) {
    var reboot_values = [0, 1];
    if (!reboot_values.includes(reboot)) {
        throw new Error("reboot must be one of " + reboot_values.join(", "));
    }
    if (reboot === 0) {
        return [];
    }
    return [0xff, 0x10, 0xff];
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
 *
 * @param {*} modbus_config
 */
function modbusChannelConfig(modbus_config) {
    var action_values = [0, 1, 2]; // 0: delete, 1: add, 2: update modbus channel name
    if (!action_values.includes(modbus_config.action)) {
        throw new Error("modbus_config.action must be one of " + action_values.join(", "));
    }

    var action = modbus_config.action;
    var buffer;
    switch (action) {
        case 0x00: // delete
            buffer = new Buffer(4);
            buffer.writeUInt8(0xff);
            buffer.writeUInt8(0xef);
            buffer.writeUInt8(0x00);
            buffer.writeUInt8(modbus_config.channel_id);
            break;
        case 0x01: // add
            buffer = new Buffer(8);
            buffer.writeUInt8(0xff);
            buffer.writeUInt8(0xef);
            buffer.writeUInt8(0x01);
            buffer.writeUInt8(modbus_config.channel_id);
            buffer.writeUInt8(modbus_config.slave_id);
            buffer.writeUInt8(modbus_config.address);
            buffer.writeUInt8(modbus_config.type);
            buffer.writeUInt8((modbus_config.sign << 4) | modbus_config.quantity);
            break;
        case 0x02: // update modbus channel name
            var name = modbus_config.name;
            var bytes = utf8ToBytes(name);
            buffer = new Buffer(5 + bytes.length);
            buffer.writeUInt8(0xff);
            buffer.writeUInt8(0xef);
            buffer.writeUInt8(0x02);
            buffer.writeUInt8(modbus_config.channel_id);
            buffer.writeUInt8(bytes.length);
            buffer.writeBytes(bytes);
            break;
    }
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

Buffer.prototype.writeBytes = function (bytes) {
    for (var i = 0; i < bytes.length; i++) {
        this.buffer[this.offset + i] = bytes[i];
    }
    this.offset += bytes.length;
};

Buffer.prototype.toBytes = function () {
    return this.buffer;
};

function utf8ToBytes(str) {
    var bytes = [];

    for (var i = 0; i < str.length; i++) {
        var charCode = str.charCodeAt(i);

        if (charCode < 0x80) {
            bytes.push(charCode);
        } else if (charCode < 0x800) {
            bytes.push(0xc0 | (charCode >> 6));
            bytes.push(0x80 | (charCode & 0x3f));
        } else if (charCode < 0x10000) {
            bytes.push(0xe0 | (charCode >> 12));
            bytes.push(0x80 | ((charCode >> 6) & 0x3f));
            bytes.push(0x80 | (charCode & 0x3f));
        } else {
            charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
            bytes.push(0xf0 | (charCode >> 18));
            bytes.push(0x80 | ((charCode >> 12) & 0x3f));
            bytes.push(0x80 | ((charCode >> 6) & 0x3f));
            bytes.push(0x80 | (charCode & 0x3f));
        }
    }

    return bytes;
}
