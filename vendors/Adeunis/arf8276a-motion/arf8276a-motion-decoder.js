function _u16be(b, o) { return (b[o] << 8) | b[o + 1]; }
function _i16be(b, o) { var v = _u16be(b, o); return v & 0x8000 ? v - 0x10000 : v; }
function _u32be(b, o) { return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0; }

function _statusFlags(b) {
    var s1 = b[1];
    return {
        lowBattery: !!(s1 & 0x02),
        configurationInconsistency: !!(s1 & 0x08),
    };
}

function _decode(bytes) {
    if (!bytes || bytes.length < 2) return {};
    var fc = bytes[0];
    var st = _statusFlags(bytes);
    var out = {};

    out.battery = st.lowBattery ? 'low' : 'ok';
    out.appflag_1 = st.configurationInconsistency;

    switch (fc) {
        case 0x4e: {
            out.appflag_2 = bytes.length < 7;
            if (bytes.length >= 4) out.presence_global_counter = _u16be(bytes, 2);
            if (bytes.length >= 7) {
                out.presence_instant_counter = _i16be(bytes, 4);
                out.brightness = bytes[6];
            }
            break;
        }
        case 0x4f: {
            out.presence_alarm = true;
            out.presence_global_counter = _u16be(bytes, 2);
            out.presence_instant_counter = _u16be(bytes, 4);
            break;
        }
        case 0x50: {
            out.brightness_alarm = !!bytes[2];
            out.brightness = bytes[3];
            break;
        }
        case 0x5c: {
            var pairs = Math.floor((bytes.length - 3) / 2);
            out.appflag_2 = pairs === 0;
            out.presence_alarm = !!bytes[2];
            if (pairs > 0) {
                out.presence_time_occupancy_rate = bytes[3];
                out.brightness = bytes[4];
            }
            break;
        }
        case 0x5d: {
            out.presence_alarm = !!bytes[2];
            out.brightness = bytes[3];
            break;
        }
        case 0x51: {
            out.button_current_state = !!(bytes[2] & 0x01);
            out.button_previous_frame_state = !!((bytes[2] >> 1) & 0x01);
            out.button_global_counter = _u32be(bytes, 3);
            out.button_instant_counter = _u16be(bytes, 7);
            break;
        }
        case 0x52: {
            out.dry_contact_current_state = !!(bytes[2] & 0x01);
            out.dry_contact_previous_frame_state = !!((bytes[2] >> 1) & 0x01);
            out.dry_contact_global_counter = _u32be(bytes, 3);
            out.dry_contact_instant_counter = _u16be(bytes, 7);
            break;
        }
        case 0x20: {
            if (bytes.length === 4) {
                out.lora_adr = !!(bytes[2] & 0x01);
                out.lora_provisioning_mode = bytes[3] === 0 ? 'ABP' : 'OTAA';
                out.missing_network = false;
            } else {
                out.missing_network = true;
            }
            break;
        }
        case 0x10:
        case 0x1f:
        case 0x30:
        case 0x33:
        default:
            break;
    }
    return out;
}

function decodeUplink(input) { return { data: _decode(input.bytes) }; }
function Decode(fPort, bytes) { return _decode(bytes); }
function Decoder(bytes, port) { return _decode(bytes); }
