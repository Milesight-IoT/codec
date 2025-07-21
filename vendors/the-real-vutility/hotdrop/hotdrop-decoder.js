// This version of the index file contains a decodeUplink function that does not use
// the Buffer or ArrayBuffer or TypedArray Classes.
// This version is compatible with ES5
// Due to limitations in ES5, only a limited set of downlink values are permitted.
// Because of this, the decodeDownlink function is not implemented

/**
 * Decode uplink
 * @param {number} fPort - The Port Field on which the uplink has been sent
 * @param {number[]} bytes - Array of bytes represented as numbers as it has been sent from the device
 * @param {variables} variables - variables contains the device variables e.g. {"calibration": "3.5"}. Both key/value are type string
 * @returns {VoltDropDirectData} The decoded object
 */
function Decode(fPort, bytes, variables) {
    var result = {
      data: {},
    };
    var rawBytesArray = bytes;
    // Uplink payload must be 11 bytes long.
    if (rawBytesArray.length != 11) {
      throw new Error("Payload length must be 11 bytes");
    }
  
    // Packet ID - 1 byte
    var packetId = rawBytesArray[0];
    if (packetId !== 50) {
      throw new Error("Payload packet ID is not equal to 50");
    }
  
    // Constant factors for formulas
    var capacitorVoltageFactor = 5.0 / 255.0;
    var temperatureCelsiusFactor = 120.0 / 255.0;
    var deciToUnitFactor = 0.1;
  
    // Amp hour accumulation - 4 bytes
    // 32-bit unsigned integer in network byte order (MSB/BE) reported in deci-ampere-hour (dAh)
    var ampHourAccumulationDeciAmpere =
      ((rawBytesArray[1] << 24) +
        (rawBytesArray[2] << 16) +
        (rawBytesArray[3] << 8) +
        rawBytesArray[4]) >>>
      0;
  
    // Average amps - 2 bytes
    // 16-bit unsigned integer in network byte order (MSB/BE) reported in deci-ampere (dA),
    // this average represents the entire time since the last transmit (one entire transmit period)
    var averageAmpsDeciAmpere =
      ((rawBytesArray[5] << 8) + rawBytesArray[6]) >>> 0;
  
    // Max Offset - 1 byte
    // 8-bit unsigned integer representing the percent offset above the Average amps value.
    var maxOffset = rawBytesArray[7];
  
    // Min Offset - 1 byte
    // 8-bit unsigned integer representing the percent offset below the Average amps value.
    var minOffset = rawBytesArray[8];
  
    // Capacitor Voltage Scalar - 1 byte
    // 8-bit unsigned integer representing the capacitor voltage.
    // (as if the integer range from 0-255 is scaled to between 0.0V and 5.0V)
    var capacitorVoltageScalar = rawBytesArray[9];
  
    // Temperature Scalar
    // 8-bit unsigned integer representing the temperature.
    // (as if the integer range from 0-255 is scaled to between -40C and 80C)
    var temperatureScalar = rawBytesArray[10];
  
    // Calculated fields
    var maximumAmpsDeciAmpere =
      averageAmpsDeciAmpere * ((100 + maxOffset) / 100.0);
    var minimumAmpsDeciAmpere =
      averageAmpsDeciAmpere * ((100 - minOffset) / 100.0);
    var capacitorVoltage = capacitorVoltageFactor * capacitorVoltageScalar;
    var temperatureCelsius = temperatureCelsiusFactor * temperatureScalar - 40;
  
    result.data = {
      ampHourAccumulation: ampHourAccumulationDeciAmpere * deciToUnitFactor,
      averageAmps: averageAmpsDeciAmpere * deciToUnitFactor,
      maximumAmps: maximumAmpsDeciAmpere * deciToUnitFactor,
      minimumAmps: minimumAmpsDeciAmpere * deciToUnitFactor,
      capacitorVoltage: capacitorVoltage,
      temperatureCelsius: temperatureCelsius,
    };
  
    return result.data;
  }
  
  /**
   * Downlink encode
   * @param {number} fPort - The Port Field on which the downlink must be sent
   * @param {Object} input - The higher-level object representing your downlink
   * @param {variables} variables - variables contains the device variables e.g. {"calibration": "3.5"}. Both key/value are type string
   * @returns {number[]} Array of bytes represented as numbers as it will be sent to the device
   */
  function Encode(fPort, input, variables) {
    var result = {
      bytes: [],
    };
  
    var definedDownlinkVars = 0;
    if (typeof input.data.transmitIntervalSeconds !== "undefined") {
      definedDownlinkVars += 1;
    }
    if (typeof input.data.measurementIntervalMs !== "undefined") {
      definedDownlinkVars += 1;
    }
    if (typeof input.data.lowPowerThreshold !== "undefined") {
      definedDownlinkVars += 1;
    }
    if (typeof input.data.factoryReset !== "undefined") {
      definedDownlinkVars += 1;
    }
  
    if (definedDownlinkVars > 1) {
      throw new Error("Invalid downlink: More than one downlink type defined");
    }
  
    if (typeof input.data.transmitIntervalSeconds !== "undefined") {
      if (input.data.transmitIntervalSeconds < 60) {
        throw new Error("Invalid downlink: transmit interval cannot be less than 1 min"
        );
      }
      if (input.data.transmitIntervalSeconds > 1800) {
        throw new Error(
          "Invalid downlink: transmit interval cannot be greater than 30 min"
        );
      }
  
      var transmitInterval1MinDownlinkBytes = [
        0x54, 0x00, 0x00, 0x00, 0x70, 0x42, 0x00, 0x00, 0x00, 0x00,
      ];
      var transmitInterval2MinDownlinkBytes = [
        0x54, 0x00, 0x00, 0x00, 0xf0, 0x42, 0x00, 0x00, 0x00, 0x00,
      ];
      var transmitInterval5MinDownlinkBytes = [
        0x54, 0x00, 0x00, 0x00, 0x96, 0x43, 0x00, 0x00, 0x00, 0x00,
      ];
      var transmitInterval15MinDownlinkBytes = [
        0x54, 0x00, 0x00, 0x00, 0x61, 0x44, 0x00, 0x00, 0x00, 0x00,
      ];
      var transmitInterval30MinDownlinkBytes = [
        0x54, 0x00, 0x00, 0x00, 0xe1, 0x44, 0x00, 0x00, 0x00, 0x00,
      ];
  
      if (input.data.transmitIntervalSeconds === 60) {
        result.bytes = transmitInterval1MinDownlinkBytes;
      } else if (input.data.transmitIntervalSeconds === 120) {
        result.bytes = transmitInterval2MinDownlinkBytes;
      } else if (input.data.transmitIntervalSeconds === 300) {
        result.bytes = transmitInterval5MinDownlinkBytes;
      } else if (input.data.transmitIntervalSeconds === 900) {
        result.bytes = transmitInterval15MinDownlinkBytes;
      } else if (input.data.transmitIntervalSeconds === 1800) {
        result.bytes = transmitInterval30MinDownlinkBytes;
      } else {
        throw new Error(
          "Invalid downlink: transmit interval is not 1 min, 2 mins, 5 mins, 15 mins or 30 mins"
        );
      }
      return result.bytes;
    }
  
    if (typeof input.data.measurementIntervalMs !== "undefined") {
      if (input.data.measurementIntervalMs < 200) {
        throw new Error(
          "Invalid downlink: measurement interval cannot be less than 200 ms"
        );
      }
      if (input.data.measurementIntervalMs > 10000) {
        throw new Error(
          "Invalid downlink: measurement interval cannot be greater than 10000 ms"
        );
      }
  
      var measurementInterval200MsDownlinkBytes = [
        0x4d, 0x00, 0x00, 0x00, 0x48, 0x43, 0x00, 0x00, 0x00, 0x00,
      ];
      var measurementInterval500MsDownlinkBytes = [
        0x4d, 0x00, 0x00, 0x00, 0xfa, 0x43, 0x00, 0x00, 0x00, 0x00,
      ];
      var measurementInterval1000MsDownlinkBytes = [
        0x4d, 0x00, 0x00, 0x00, 0x7a, 0x44, 0x00, 0x00, 0x00, 0x00,
      ];
      var measurementInterval2000MsDownlinkBytes = [
        0x4d, 0x00, 0x00, 0x00, 0xfa, 0x44, 0x00, 0x00, 0x00, 0x00,
      ];
      var measurementInterval10000MsDownlinkBytes = [
        0x4d, 0x00, 0x00, 0x40, 0x1c, 0x46, 0x00, 0x00, 0x00, 0x00,
      ];
  
      if (input.data.measurementIntervalMs === 200) {
        result.bytes = measurementInterval200MsDownlinkBytes;
      } else if (input.data.measurementIntervalMs === 500) {
        result.bytes = measurementInterval500MsDownlinkBytes;
      } else if (input.data.measurementIntervalMs === 1000) {
        result.bytes = measurementInterval1000MsDownlinkBytes;
      } else if (input.data.measurementIntervalMs === 2000) {
        result.bytes = measurementInterval2000MsDownlinkBytes;
      } else if (input.data.measurementIntervalMs === 10000) {
        result.bytes = measurementInterval10000MsDownlinkBytes;
      } else {
        throw new Error(
          "Invalid downlink: measurement interval is not 200 ms, 500 ms, 1000 ms, 2000 ms, 10000 ms"
        );
      }
  
      return result.bytes;
    }
  
    if (typeof input.data.lowPowerThreshold !== "undefined") {
      var lowPowerTolerance = 0.000001;
      // Have leniant lower tolerance due to floating point
      if (input.data.lowPowerThreshold + lowPowerTolerance < 2.1) {
        throw new Error(
          "Invalid downlink: low power threshold cannot be less than 2.1 v"
        );
      }
      // Have leniant upper tolerance due to floating point
      if (input.data.lowPowerThreshold - lowPowerTolerance > 3.9) {
        throw new Error(
          "Invalid downlink: low power threshold cannot be greater than 3.9 v"
        );
      }
  
      var lowPowerThreshold3dot9VDownlinkBytes = [
        0x50, 0x00, 0x9a, 0x99, 0x79, 0x40, 0x00, 0x00, 0x00, 0x00,
      ];
      var lowPowerThreshold3dot4VDownlinkBytes = [
        0x50, 0x00, 0x9a, 0x99, 0x59, 0x40, 0x00, 0x00, 0x00, 0x00,
      ];
      var lowPowerThreshold2dot1VDownlinkBytes = [
        0x50, 0x00, 0x66, 0x66, 0x06, 0x40, 0x00, 0x00, 0x00, 0x00,
      ];
  
      if (
        input.data.lowPowerThreshold > 3.9 - lowPowerTolerance &&
        input.data.lowPowerThreshold < 3.9 + lowPowerTolerance
      ) {
        result.bytes = lowPowerThreshold3dot9VDownlinkBytes;
      } else if (
        input.data.lowPowerThreshold > 3.4 - lowPowerTolerance &&
        input.data.lowPowerThreshold < 3.4 + lowPowerTolerance
      ) {
        result.bytes = lowPowerThreshold3dot4VDownlinkBytes;
      } else if (
        input.data.lowPowerThreshold > 2.1 - lowPowerTolerance &&
        input.data.lowPowerThreshold < 2.1 + lowPowerTolerance
      ) {
        result.bytes = lowPowerThreshold2dot1VDownlinkBytes;
      } else {
        throw new Error(
          "Invalid downlink: low power threshold is not 3.9, 3.4, or 2.1"
        );
      }
      return result.bytes;
    }
  
    if (typeof input.data.factoryReset !== "undefined") {
      var factoryResetDownlinkBytes = [
        0x46, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ];
      if (input.data.factoryReset === true) {
        result.bytes = factoryResetDownlinkBytes;
        return result.bytes;
      } else {
        throw new Error("Invalid downlink: valid factoryReset value is true");
      }
    }
  
    throw new Error("Invalid downlink: invalid downlink parameter name");
  }
  