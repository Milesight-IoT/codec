/**
 * Payload Encoder for Milesight Network Server
 *
 * Copyright 2024 Milesight IoT
 *
 * @product WT201
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
    if ("sync_time" in payload) {
        encoded = encoded.concat(syncTime(payload.sync_time));
    }
    if ("timezone" in payload) {
        encoded = encoded.concat(setTimezone(payload.timezone));
    }
    if ("daylight_saving_time_config" in payload) {
        encoded = encoded.concat(setDaylightSavingTime(payload.daylight_saving_time_config.enable, payload.daylight_saving_time_config.offset, payload.daylight_saving_time_config.start_time, payload.daylight_saving_time_config.end_time));
    }
    if ("temperature_control" in payload) {
        if ("enable" in payload.temperature_control) {
            encoded = encoded.concat(setTemperatureControlEnable(payload.temperature_control.enable));
        }
        if ("mode" in payload.temperature_control && "temperature" in payload.temperature_control) {
            encoded = encoded.concat(setTemperatureControl(payload.temperature_control.mode, payload.temperature_control.temperature, payload.temperature_unit));
        }
    }
    if ("temperature_calibration" in payload) {
        encoded = encoded.concat(setTemperatureCalibration(payload.temperature_calibration.enable, payload.temperature_calibration.temperature));
    }
    if ("temperature_tolerance" in payload) {
        encoded = encoded.concat(setTemperatureTolerance(payload.temperature_tolerance.temperature_error, payload.temperature_tolerance.auto_control_temperature_error));
    }
    if ("temperature_level_up_condition" in payload) {
        encoded = encoded.concat(setTemperatureLevelUpCondition(payload.temperature_level_up_condition.type, payload.temperature_level_up_condition.time, payload.temperature_level_up_condition.temperature_error));
    }
    if ("outside_temperature_control_config" in payload) {
        encoded = encoded.concat(setOutsideTemperatureControl(payload.outside_temperature_control_config.enable, payload.outside_temperature_control_config.timeout));
    }
    if ("outside_temperature" in payload) {
        encoded = encoded.concat(setOutsideTemperature(payload.outside_temperature));
    }
    if ("freeze_protection_config" in payload) {
        encoded = encoded.concat(setFreezeProtection(payload.freeze_protection_config.enable, payload.freeze_protection_config.temperature));
    }
    if ("fan_mode" in payload) {
        encoded = encoded.concat(setFanMode(payload.fan_mode));
    }
    if ("plan_mode" in payload) {
        encoded = encoded.concat(setPlanMode(payload.plan_mode));
    }
    if ("plan_schedule" in payload) {
        for (var i = 0; i < payload.plan_schedule.length; i++) {
            encoded = encoded.concat(setPlanSchedule(payload.plan_schedule[i].type, payload.plan_schedule[i].id, payload.plan_schedule[i].enable, payload.plan_schedule[i].repeat, payload.plan_schedule[i].repeat_days, payload.plan_schedule[i].execute_time));
        }
    }
    if ("plan_config" in payload) {
        encoded = encoded.concat(setPlanConfig(payload.plan_config.type, payload.plan_config.temperature_control_mode, payload.plan_config.fan_mode, payload.plan_config.temperature_target, payload.plan_config.temperature_error, payload.temperature_unit));
    }
    if ("card_config" in payload) {
        encoded = encoded.concat(setCardConfig(payload.card_config.enable, payload.card_config.action_type, payload.card_config.in_plan_type, payload.card_config.out_plan_type, payload.card_config.invert));
    }
    if ("child_lock_config" in payload) {
        encoded = encoded.concat(setChildLock(payload.child_lock_config));
    }
    if ("wires" in payload) {
        encoded = encoded.concat(setWires(payload.wires, payload.mode));
    }
    if ("ob_mode" in payload) {
        encoded = encoded.concat(setOBMode(payload.ob_mode));
    }

    return encoded;
}

/**
 * reboot device
 * @param {boolean} reboot
 * @example payload: { "reboot": 1 } output: FF10FF
 */
function reboot(reboot) {
    var reboot_values = [0, 1];
    if (reboot_values.indexOf(reboot) === -1) {
        throw new Error("reboot must be one of " + reboot_values.join(", "));
    }

    if (reboot === 0) {
        return [];
    }
    return [0xff, 0x10, 0xff];
}

/**
 * report device status
 * @param {string} report_status values: (0: "plan", 1: "periodic")
 * @example payload: { "report_status": 1 } output: FF2801
 */
function reportStatus(report_status) {
    var report_status_values = [0, 1];
    if (report_status_values.indexOf(report_status) === -1) {
        throw new Error("report_status must be one of " + report_status_values.join(", "));
    }

    var buffer = new Buffer(3);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x28);
    buffer.writeUInt8(report_status_values.indexOf(report_status));
    return buffer.toBytes();
}

/**
 * set report interval
 * @param {number} report_interval unit: minute
 * @example { "report_interval": 20 }
 */
function setReportInterval(report_interval) {
    if (typeof report_interval !== "number") {
        throw new Error("report_interval must be a number");
    }

    var buffer = new Buffer(5);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x8e);
    buffer.writeUInt8(0x00);
    buffer.writeUInt16LE(report_interval);
    return buffer.toBytes();
}

/**
 * set collection interval
 * @param {number} collection_interval unit: second
 * @example payload: { "collection_interval": 300 } output: FF022C01
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
 * sync time
 * @param {boolean} sync_time
 * @example { "sync_time": 1 }
 */
function syncTime(sync_time) {
    var sync_time_values = [0, 1];
    if (sync_time_values.indexOf(sync_time) === -1) {
        throw new Error("sync_time must be one of " + sync_time_values.join(", "));
    }

    if (sync_time === 0) {
        return [];
    }
    return [0xff, 0x4a, 0xff];
}

/**
 * set timezone
 * @param {number} timezone
 * @example payload: { "timezone": 8 } output: FFBDE001
 * @example payload: { "timezone": -4 } output: FFBD10FF
 */
function setTimezone(timezone) {
    if (typeof timezone !== "number") {
        throw new Error("timezone must be a number");
    }

    var buffer = new Buffer(4);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0xbd);
    buffer.writeInt16LE(timezone * 60);
    return buffer.toBytes();
}

/**
 * set daylight saving time
 * @param {boolean} enable
 * @param {number} offset, unit: minute
 * @param {object} start_time
 * @param {number} start_time.month, range: [1, 12]
 * @param {number} start_time.days, range: [1, 31]
 * @param {number} start_time.time, unit: minute
 * @param {object} end_time
 * @param {number} end_time.month, range: [1, 12]
 * @param {number} end_time.days, range: [1, 31]
 * @param {number} end_time.time, unit: minute
 * @example { "daylight_saving_time": { "enable": 1, "offset": 60, "start_time": { "month": 3, "days": 8, "time": 480 }, "end_time": { "month": 11, "days": 8, "time": 480 } } }
 */
function setDaylightSavingTime(enable, offset, start_time, end_time) {
    var daylight_saving_time_enable_values = [0, 1];
    if (daylight_saving_time_enable_values.indexOf(enable) === -1) {
        throw new Error("daylight_saving_time.enable must be one of " + daylight_saving_time_enable_values.join(", "));
    }

    var buffer = new Buffer(12);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0xba);
    buffer.writeUInt8(enable);
    buffer.writeUInt8(offset);
    buffer.writeUInt8(start_time.month);
    buffer.writeUInt8(start_time.days);
    buffer.writeUInt8(start_time.time);
    buffer.writeUInt8(end_time.month);
    buffer.writeUInt8(end_time.days);
    buffer.writeUInt8(end_time.time);
    return buffer.toBytes();
}

/**
 * set temperature control enable
 * @param {boolean} enable values: (0: "disable", 1: "enable")
 * @example { "temperature_control": {"enable": 1 } }
 */
function setTemperatureControlEnable(enable) {
    var temperature_control_enable_values = [0, 1];
    if (temperature_control_enable_values.indexOf(enable) === -1) {
        throw new Error("temperature_control.enable must be one of " + temperature_control_enable_values.join(", "));
    }

    var buffer = new Buffer(3);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0xc5);
    buffer.writeUInt8(enable);
    return buffer.toBytes();
}

/**
 * set temperature control
 * @param {string} mode values: (0: "heat", 1: "em heat", 2: "cool", 3: "auto")
 * @param {number} temperature unit: celsius
 * @param {string} temperature_unit values: (0: "celsius", 1: "fahrenheit")
 * @example payload: { "temperature_control": { "mode": 2, "temperature": 25 }, "temperature_unit": 0 } output: FFB70219
 * @example payload: { "temperature_control": { "mode": 2, "temperature": 77 }, "temperature_unit": 1 } output: FFB701CD
 */
function setTemperatureControl(mode, temperature, temperature_unit) {
    var temperature_control_mode_values = [0, 1, 2, 3];
    if (temperature_control_mode_values.indexOf(mode) === -1) {
        throw new Error("mode must be one of " + temperature_control_mode_values.join(", "));
    }
    if (typeof temperature !== "number") {
        throw new Error("temperature must be a number");
    }
    var temperature_unit_values = [0, 1];
    if (temperature_unit_values.indexOf(temperature_unit) === -1) {
        throw new Error("temperature_unit must be one of " + temperature_unit_values.join(", "));
    }

    t = temperature_unit === 1 ? temperature | 0x80 : temperature & 0x7f;

    var buffer = new Buffer(4);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0xb7);
    buffer.writeUInt8(temperature_control_mode_values.indexOf(mode));
    buffer.writeUInt8(t);
    return buffer.toBytes();
}

/**
 * @param {boolean} enable
 * @param {number} temperature, unit: celsius
 * @example { "temperature_calibration": { "enable": 1, "temperature": 25 } }
 */
function setTemperatureCalibration(enable, temperature) {
    var temperature_calibrate_enable_values = [0, 1];
    if (temperature_calibrate_enable_values.indexOf(enable) === -1) {
        throw new Error("temperature_calibration.enable must be one of " + temperature_calibrate_enable_values.join(", "));
    }
    if (enable && typeof temperature !== "number") {
        throw new Error("temperature_calibration.temperature must be a number");
    }

    var buffer = new Buffer(5);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0xab);
    buffer.writeUInt8(enable);
    buffer.writeInt16LE(temperature * 10);
    return buffer.toBytes();
}

/**
 * set temperature tolerance
 * @param {number} temperature_error
 * @param {number} auto_control_temperature_error
 * @example { "temperature_tolerance": {"temperature_error": 1, "auto_control_temperature_error": 1 }}
 */
function setTemperatureTolerance(temperature_error, auto_control_temperature_error) {
    if (typeof temperature_error !== "number") {
        throw new Error("temperature_tolerance.temperature_error must be a number");
    }
    if (typeof auto_control_temperature_error !== "number") {
        throw new Error("temperature_tolerance.auto_control_temperature_error must be a number");
    }

    var buffer = new Buffer(4);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x9f);
    buffer.writeUInt8(temperature_error * 10);
    buffer.writeUInt8(auto_control_temperature_error * 10);
    return buffer.toBytes();
}

/**
 * @param {string} type values: (0: "heat", 1: "cool")
 * @param {number} time unit: minute
 * @param {number} temperature_error unit: celsius
 * @example { "temperature_level_up_condition": { "type": 0, "time": 10, "temperature_error": 1 } }
 */
function setTemperatureLevelUpCondition(type, time, temperature_error) {
    var temperature_level_up_condition_type_values = [0, 1];
    if (temperature_level_up_condition_type_values.indexOf(type) === -1) {
        throw new Error("temperature_level_up_condition.type must be one of " + temperature_level_up_condition_type_values.join(", "));
    }
    if (typeof time !== "number") {
        throw new Error("temperature_level_up_condition.time must be a number");
    }
    if (typeof temperature_error !== "number") {
        throw new Error("temperature_level_up_condition.temperature_error must be a number");
    }

    var buffer = new Buffer(5);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0xb1);
    buffer.writeUInt8(temperature_level_up_condition_type_values.indexOf(type));
    buffer.writeUInt8(time);
    buffer.writeUInt8(temperature_error * 10);
    return buffer.toBytes();
}

/**
 * @param {boolean} enable
 * @param {number} timeout, unit: minute
 * @example { "outside_temperature_control_config": { "enable": 1, "timeout": 10 } }
 */
function setOutsideTemperatureControl(enable, timeout) {
    var outside_temperature_control_enable_values = [0, 1];
    if (outside_temperature_control_enable_values.indexOf(enable) === -1) {
        throw new Error("outside_temperature_control_config.enable must be one of " + outside_temperature_control_enable_values.join(", "));
    }
    if (enable && typeof timeout !== "number") {
        throw new Error("outside_temperature_control_config.timeout must be a number");
    }

    var buffer = new Buffer(4);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0xc4);
    buffer.writeUInt8(enable);
    buffer.writeUInt8(timeout);
    return buffer.toBytes();
}

/**
 * @param {number} outside_temperature, unit: celsius
 * @example { "outside_temperature": 25 }
 */
function setOutsideTemperature(outside_temperature) {
    if (typeof outside_temperature !== "number") {
        throw new Error("outside_temperature must be a number");
    }

    var buffer = new Buffer(4);
    buffer.writeUInt8(0x03);
    buffer.writeInt16LE(outside_temperature * 10);
    buffer.writeUInt8(0xff);
    return buffer.toBytes();
}

/**
 * freeze protection configuartion
 * @param {boolean} enable
 * @param {number} temperature, unit: celsius
 * @example { "freeze_protection_config": { "enable": 1, "temperature": 10 } }
 */
function setFreezeProtection(enable, temperature) {
    var freeze_protection_enable_values = [0, 1];
    if (freeze_protection_enable_values.indexOf(enable) === -1) {
        throw new Error("freeze_protection_config.enable must be one of " + freeze_protection_enable_values.join(", "));
    }
    if (enable && typeof temperature !== "number") {
        throw new Error("freeze_protection_config.temperature must be a number");
    }

    var buffer = new Buffer(4);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0xb0);
    buffer.writeUInt8(enable);
    buffer.writeInt16LE(temperature * 10);
    return buffer.toBytes();
}

/**
 * @param {string} fan_mode values: (0: "auto", 1: "on", 2: "circulate")
 * @example { "fan_mode": 0 }
 */
function setFanMode(fan_mode) {
    var fan_mode_values = [0, 1, 2];
    if (fan_mode_values.indexOf(fan_mode) === -1) {
        throw new Error("fan_mode must be one of " + fan_mode_values.join(", "));
    }

    var buffer = new Buffer(3);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0xb6);
    buffer.writeUInt8(fan_mode_values.indexOf(fan_mode));
    return buffer.toBytes();
}

/**
 * set plan mode
 * @param {string} plan_mode values: (0: "wake", 1: "away", 2: "home", 3: "sleep")
 * @example { "plan_mode": 0 }
 */
function setPlanMode(plan_mode) {
    var plan_mode_values = [0, 1, 2, 3];
    if (plan_mode_values.indexOf(plan_mode) === -1) {
        throw new Error("plan_mode must be one of " + plan_mode_values.join(", "));
    }

    var buffer = new Buffer(3);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0xc2);
    buffer.writeUInt8(plan_mode_values.indexOf(plan_mode));
    return buffer.toBytes();
}
/**
 * set plan schedule
 * @param {string} type values: (0: "wake", 1: "away", 2: "home", 3: "sleep")
 * @param {number} id range: [0, 15]
 * @param {boolean} enable
 * @param {boolean} repeat
 * @param {Array} repeat_days values: (0: "mon", 1: "tues", 2: "wed", 3: "thur", 4: "fri", 5: "sat", 6: "sun")
 * @param {number} execute_time
 * @example { "plan_schedule": [{ "type": "wake", "id": 0, "enable": true, "repeat": false, "execute_time": "04:00" }] }
 */
function setPlanSchedule(type, id, enable, repeat, repeat_days, execute_time) {
    var plan_schedule_type_values = [0, 1, 2, 3];
    if (plan_schedule_type_values.indexOf(type) === -1) {
        throw new Error("plan_schedule[].type must be one of " + plan_schedule_type_values.join(", "));
    }
    if (typeof id !== "number") {
        throw new Error("plan_schedule[].id must be a number");
    }
    if (id < 0 || id > 15) {
        throw new Error("id must be in range [0, 15]");
    }
    var plan_schedule_enable_values = [0, 1];
    if (plan_schedule_enable_values.indexOf(enable) === -1) {
        throw new Error("plan_schedule[].enable must be one of " + plan_schedule_enable_values.join(", "));
    }
    var plan_schedule_repeat_values = [0, 1];
    if (plan_schedule_repeat_values.indexOf(repeat) === -1) {
        throw new Error("plan_schedule[].repeat must be one of " + plan_schedule_repeat_values.join(", "));
    }
    if (typeof execute_time !== "number") {
        throw new Error("plan_schedule[].execute_time must be a number");
    }
    var plan_schedule_repeat_days_values = [0, 1, 2, 3, 4, 5, 6];
    if (repeat === true && typeof repeat_days !== "Array") {
        throw new Error("repeat_days must be a array");
    }
    var days = 0x00;
    if (repeat === true) {
        for (var day in repeat_days) {
            if (plan_schedule_repeat_days_values.indexOf(day) === -1) {
                throw new Error("repeat_days must be one of " + plan_schedule_repeat_days_values.join(", "));
            }
            idx = plan_schedule_repeat_days_values.indexOf(day) + 1;
            days |= 1 << idx;
        }
    }

    var buffer = new Buffer(8);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0xc9);
    buffer.writeUInt8(plan_schedule_type_values.indexOf(type));
    buffer.writeUInt8(id);
    buffer.writeUInt8(enable);
    buffer.writeUInt8(days);
    buffer.writeUInt16LE(execute_time);
    return buffer.toBytes();
}

/**
 * set plan config
 * @param {string} type values: (0: "wake", 1: "away", 2: "home", 3: "sleep")
 * @param {string} temperature_control_mode values: (0: "heat", 1: "em heat", 2: "cool", 3: "auto")
 * @param {string} fan_mode values: (0: "auto", 1: "on", 2: "circulate")
 * @param {number} temperature_target
 * @param {number} temperature_error
 * @param {string} temperature_unit values: (0: "celsius", 1: "fahrenheit")
 * @example payload: { "plan_config": { "type": 0, "temperature_control_mode": 2, "fan_mode": 0, "temperature_target": 20, "temperature_error": 1 }, "temperature_unit": 0}, output: FFC8000200140A
 * @example payload: { "plan_config": { "type": 0, "temperature_control_mode": 2, "fan_mode": 0, "temperature_target": 77, "temperature_error": 1 }, "temperature_unit": 1}, output: FFC8000200CD0A
 */
function setPlanConfig(type, temperature_control_mode, fan_mode, temperature_target, temperature_error, temperature_unit) {
    var plan_config_type_values = [0, 1, 2, 3];
    var plan_config_temperature_control_mode_values = [0, 1, 2, 3];
    var plan_config_fan_mode_values = [0, 1, 2];
    if (plan_config_type_values.indexOf(type) === -1) {
        throw new Error("plan_config.type must be one of " + plan_config_type_values.join(", "));
    }
    if (plan_config_temperature_control_mode_values.indexOf(temperature_control_mode) === -1) {
        throw new Error("plan_config.temperature_control_mode must be one of " + plan_config_temperature_control_mode_values.join(", "));
    }
    if (plan_config_fan_mode_values.indexOf(fan_mode) === -1) {
        throw new Error("plan_config.fan_mode must be one of " + plan_config_fan_mode_values.join(", "));
    }
    if (typeof temperature_target !== "number") {
        throw new Error("temperature_target must be a number");
    }
    if (typeof temperature_error !== "number") {
        throw new Error("temperature_error must be a number");
    }
    var temperature_unit_values = [0, 1];
    if (temperature_unit_values.indexOf(temperature_unit) === -1) {
        throw new Error("temperature_unit must be one of " + temperature_unit_values.join(", "));
    }

    var buffer = new Buffer(7);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0xc8);
    buffer.writeUInt8(plan_config_type_values.indexOf(type));
    buffer.writeUInt8(plan_config_temperature_control_mode_values.indexOf(temperature_control_mode));
    buffer.writeUInt8(plan_config_fan_mode_values.indexOf(fan_mode));
    var tmp = temperature_unit === 1 ? temperature_target | 0x80 : temperature_target & 0x7f;
    buffer.writeInt8(tmp);
    buffer.writeInt8(temperature_error * 10);
    return buffer.toBytes();
}

/**
 * set card config
 * @param {boolean} enable
 * @param {string} action_type values: (0: "power", 1: "plan")
 * @param {string} in_plan_type values: (0: "wake", 1: "away", 2: "home", 3: "sleep")
 * @param {string} out_plan_type values: (0: "wake", 1: "away", 2: "home", 3: "sleep")
 * @param {boolean} invert
 * @example
 * - { "card_config": { "enable": 0 } }
 * - { "card_config": { "enable": 1, "action_type": 0, "invert": 1 } }
 * - { "card_config": { "enable": 1, "action_type": 1, "in_plan_type": 0, "out_plan_type": 1, "invert": 0 } }
 */
function setCardConfig(enable, action_type, in_plan_type, out_plan_type, invert) {
    var card_config_enable_values = [0, 1];
    if (card_config_enable_values.indexOf(enable) === -1) {
        throw new Error("card_config.enable must be one of " + card_config_enable_values.join(", "));
    }
    var card_config_action_type_values = [0, 1];
    if (enable && card_config_action_type_values.indexOf(action_type) === -1) {
        throw new Error("card_config.action_type must be one of " + card_config_action_type_values.join(", "));
    }

    var action = 0x00;
    if (action_type === 1) {
        var card_config_plan_type_values = [0, 1, 2, 3];
        if (card_config_plan_type_values.indexOf(in_plan_type) === -1) {
            throw new Error("card_config.in_plan_type must be one of " + card_config_plan_type_values.join(", "));
        } else {
            action |= card_config_plan_type_values.indexOf(in_plan_type) << 4;
        }
        if (card_config_plan_type_values.indexOf(out_plan_type) === -1) {
            throw new Error("card_config.out_plan_type must be one of " + card_config_plan_type_values.join(", "));
        } else {
            action |= card_config_plan_type_values.indexOf(out_plan_type);
        }
    }

    var card_config_invert_values = [0, 1];
    if (enable && card_config_invert_values.indexOf(invert) === -1) {
        throw new Error("card_config.invert must be one of " + card_config_invert_values.join(", "));
    }

    var buffer = new Buffer(6);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0xc1);
    buffer.writeUInt8(enable);
    buffer.writeUInt8(enable ? card_config_action_type_values.indexOf(action_type) : 0);
    buffer.writeUInt8(action);
    buffer.writeUInt8(enable ? card_config_invert_values.indexOf(invert) : 0);
    return buffer.toBytes();
}

/**
 * @param {Array} btn_locked values: (0: "power", 1: "up", 2: "down", 3: "fan", 4: "mode", 5: "reset")
 * @example { "child_lock_config": { "power_button": 1, "up_button": 0, "down_button": 1, "fan_button": 0, "mode_button": 0 , "reset_button": 1 } }
 */
function setChildLock(child_lock_config) {
    var button_mask_bit_offset = { power_button: 0, up_button: 1, down_button: 2, fan_button: 3, mode_button: 4, reset_button: 5 };
    var button_values = [0, 1];

    var masked = 0x00;
    var status = 0x00;
    for (var button in child_lock_config) {
        if (button_values.indexOf(child_lock_config[button]) === -1) {
            throw new Error("child_lock_config." + button + " must be one of " + button_values.join(", "));
        }

        if (child_lock_config[button] === 1) {
            masked |= 1 << button_mask_bit_offset[button];
            status |= 1 << button_mask_bit_offset[button];
        }
    }

    var buffer = new Buffer(4);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x25);
    buffer.writeUInt8(masked);
    buffer.writeUInt8(status);
    return buffer.toBytes();
}

/**
 * set wires
 * @param {Array} wires values: ("y1", "gh", "ob", "w1", "e", "di", "pek", "w2", "aux", "y2", "gl")
 * @param {string} mode values: ("on cool", "on heat")
 * @example { "wires": ["y1", "gh", "ob", "w1", "e", "di", "pek", "w2", "aux", "y2", "gl"], "mode": "on cool" }
 */
function setWires(wires, mode) {
    if (typeof wires !== "Array") {
        throw new Error("wires must be an array");
    }

    var b1 = 0x00;
    var b2 = 0x00;
    var b3 = 0x00;
    if ("y1" in wires) b1 |= 1 << 0;
    if ("gh" in wires) b1 |= 1 << 2;
    if ("ob" in wires) b1 |= 1 << 4;
    if ("w1" in wires) b1 |= 1 << 6;

    if ("e" in wires) b2 |= 1 << 0;
    if ("di" in wires) b2 |= 1 << 2;
    if ("pek" in wires) b2 |= 1 << 4;
    if ("w2" in wires) b2 |= 1 << 6;
    if ("aux" in wires) b2 |= 1 << 7;

    if ("y2" in wires) b3 |= 1 << 0;
    if ("gl" in wires) b3 |= 1 << 1;
    b3 |= (mode === "on cool" ? 0x00 : 0x01) << 2;

    var buffer = new Buffer(5);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0xca);
    buffer.writeUInt8(b1);
    buffer.writeUInt8(b2);
    buffer.writeUInt8(b3);
    return buffer.toBytes();
}

/**
 * set ob directive mode
 * @param {string} ob_mode values: (0: "on cool", 1: "on heat")
 * @example { "ob_mode": 0 }
 */
function setOBMode(ob_mode) {
    var ob_mode_values = [0, 1];
    if (ob_mode_values.indexOf(ob_mode) === -1) {
        throw new Error("ob_mode must be one of " + ob_mode_values.join(", "));
    }

    var buffer = new Buffer(3);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x90);
    buffer.writeUInt8(ob_mode_values.indexOf(ob_mode));
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
