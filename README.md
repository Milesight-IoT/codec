# Milesight IoT Codec

Payload encoders and decoders (codecs) for [Milesight IoT](https://www.milesight-iot.com) devices. Each codec is a self-contained JavaScript file that can be plugged directly into your LoRaWAN network server or IoT platform.

## Repository Structure

```
├── vendors.json                          # Vendor registry
├── version.json                          # Current codec release version
├── bacnet_unit.md                        # BACnet unit type reference
└── vendors/
    └── milesight-iot/
        ├── devices.json                  # Device list with codec paths
        ├── <series>-series/              # e.g. am-series, ts-series, uc-series
        │   └── <device>/
        │       ├── <device>-decoder.js   # Uplink payload decoder
        │       ├── <device>-encoder.js   # Downlink payload encoder
        │       └── <device>-codec.json   # Data object model (incl. BACnet mapping)
        └── logo.png
```

## Usage

1. Look up your device in [`vendors/milesight-iot/devices.json`](vendors/milesight-iot/devices.json) and note its `decoder_script` / `encoder_script` paths.
2. Copy the codec file content into the codec/payload formatter section of your network server (ChirpStack, TTN, etc.) or IoT platform.
3. For platform integrations, the accompanying `*-codec.json` describes the decoded data model, including data types, units, access modes, and BACnet object mappings.

## Version

The current codec release is tracked in [`version.json`](version.json).

## License

This repository is released under the [MIT License](LICENSE). You are free to use, copy, modify, and distribute the codecs, including for commercial purposes, as long as the original copyright notice is retained.
