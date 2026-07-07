/**
 * FM432p-n_ap encoder — LoRaWAN IoT pulse sensor (AP version)
 */
function encode(obj) {
    if (!obj || !obj.raw_downlink) return [];
    var hex = obj.raw_downlink.replace(/\s/g, "");
    var bytes = [];
    for (var i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substring(i, i + 2), 16));
    }
    return bytes;
}

function encodeDownlink(input) {
    return { bytes: encode(input.downlinkMessages[0].payload) };
}

function Encode(obj) {
    return encode(obj);
}
