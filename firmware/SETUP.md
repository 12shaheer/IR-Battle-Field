# DropZone two-board IR hardware

Each player uses two ESP32-C3 boards:

| Board | Sketch | Device ID | Pins |
|---|---|---|---|
| Transmitter | `firmware/blaster/blaster/blaster.ino` | `TX001` | IR LED GPIO 5, trigger GPIO 4 |
| Receiver | `firmware/receiver/receiver.ino` | `RX001` | IR receiver GPIO 4 |

## Arduino setup

Select **ESP32C3 Dev Module** and enable **USB CDC On Boot**. Use Espressif ESP32 board package **2.0.17** and the **IR32** library that provides `IRSend.h` and `IRRecv.h`. Both sketches were compiled against these installed versions. IR32 uses the legacy RMT API; compatibility with ESP32 board package 3.x has not been verified. BLE is supplied by the board package.

Flash the transmitter sketch to the gun/trigger board and the receiver sketch to the hit-sensor board. Both boards advertise with a `DropZone-` prefix and must be powered during pairing and play.

## Pairing identity

The QR data for this pair is:

```json
{"gunId":"gun001","transmitter":"TX001","receiver":"RX001"}
```

Open `firmware/qr-gun001.html` in a browser to generate the matching printable QR code. Previously printed QR codes that use `gun001` for both transmitter and receiver must be replaced.

For additional pairs, give each board a unique matching suffix, for example `TX002` and `RX002`, and encode those exact case-sensitive values in that pair's QR code.

## BLE protocol

### Transmitter

| UUID | Role |
|---|---|
| `08dbb28a-ce2c-467a-9f12-4f15d574a220` | TX service |
| `1c9a1e2e-3d0a-4b3a-9a3a-2f3b4c5d6e7f` | Device ID (read) |
| `756ad6a4-2007-4dc4-9173-72dc7d6b2627` | Username (write) |
| `8b91a0d2-5f7f-49cb-8939-4455d3d24b81` | Fire (write) |
| `d4e8f591-6b7a-4c3d-9e2f-1a8b3c5d7e9f` | Physical trigger (notify) |

### Receiver

| UUID | Role |
|---|---|
| `7a3d1e09-b24f-4c8e-a649-83c2d5f17b30` | RX service |
| `1c9a1e2e-3d0a-4b3a-9a3a-2f3b4c5d6e7f` | Device ID (read) |
| `a95980fb-4f18-4b2e-a258-81bf77575117` | Hit payload (4-byte notify) |

The IR payload is a 24-bit FNV-1a username hash followed by one damage byte. The receiver forwards those same four bytes to the phone.

## Basic test

1. Confirm the phone finds and verifies both `TX001` and `RX001` during pairing.
2. Start a match and confirm the disconnected/reconnecting banner disappears.
3. Press the physical trigger and confirm the phone receives its trigger notification.
4. Point another transmitter at the receiver and confirm a four-byte hit notification is received.

## Connection fixes and verification

Install the updated phone JavaScript bundle and flash **both** updated sketches.
Use an Expo development/native build containing `react-native-ble-plx`; Expo Go
cannot load this native Bluetooth module. Keep the app in the foreground for this test.

The phone maintains two independent links and scans by each board's service UUID.
It verifies boards advertising the required service over GATT, including boards
with missing or stale Android-cached names;
only the exact device ID in the QR is accepted. Transient GATT errors may retry
within the discovery window, and notification failures reconnect the affected board.
If Android omits the advertised name, the phone connects and verifies the exact
QR device ID over GATT before accepting the board. A wrong ID is disconnected
and discovery continues. Each discovery attempt allows up to 30 seconds.
Use the two-board QR above; old single-board QR configurations are rejected.
Pairing retains both connections for gameplay. Discovery is serialized and a failed
board retries with delays from 1 to 10 seconds without restarting the healthy board.
Username configuration uses an acknowledged write matching the firmware property.
Trigger pulls never start scans or replay shots after a failed write.

Firmware leaves BLE connection timing negotiation to the phone. The transmitter
queues phone fire commands and sends IR from its main loop rather than blocking
the Bluetooth write callback. Serial Monitor at 115200 reports board connections,
disconnections, and IR initialization failures.

Run the automated connection simulations from the repository root:

```sh
node --test dropzone-app/tests/connections.test.cjs
```

Hardware acceptance test (requires your phone and physical boards):

1. Pair TX001 and RX001, start a match, and leave both idle for 10 minutes.
   Confirm there are no repeated disconnect messages in either board's Serial Monitor.
2. Test physical trigger presses, phone Shoot presses, and incoming hits from another gun.
3. Power off only RX001. Confirm the phone identifies RX as missing and TX stays
   connected. Restore RX001 and confirm hit notifications resume.
4. Repeat with only TX001, then power-cycle both together. Both should recover.
5. Leave the match while a board is off. Confirm connection retries stop.
6. Repeat with a second player's uniquely numbered pair nearby to ensure discovery
   never accepts that player's boards as your paired hardware.

For Gun 2, flash the transmitter with `DEVICE_ID "TX002"` and the receiver with
`DEVICE_ID "RX002"` before using `qr-gun002.png`. The supplied sketches default
to `TX001` / `RX001`; printing the Gun 2 QR does not change a board's firmware ID.

### Receiver reflash checklist

Open `firmware/receiver/receiver.ino` in Arduino IDE. Use `RX001` for Gun 1 or
change its `DEVICE_ID` define to `RX002` for Gun 2. Select ESP32C3 Dev Module,
ESP32 core 2.0.17, USB CDC On Boot enabled, and the board's USB port. Upload,
then open Serial Monitor at 115200 and reset the board. Expect `[BOOT]`,
`[BLE-RX] Advertising DropZone-RX001; waiting for phone` (or RX002), followed
by `[BLE-RX] Connected` once the app pairs. BLE remains available even if IR
initialization fails; that condition is logged separately.

On the phone, enable Bluetooth and Location services and grant the requested
Nearby devices and precise Location permissions. Close any BLE scanner or
other phone app already connected to this receiver, power-cycle the board,
and scan the matching Gun 1 or Gun 2 QR again. Pair through DropZone, not the
phone's system Bluetooth pairing list. Reflashing the receiver does not update
JavaScript inside an already installed APK; the app fixes require an updated
development bundle or a later app installation. No APK is needed to flash firmware.

Compilation and simulated tests do not verify RF range, battery/power stability,
phone-specific BLE behavior, or background operation. If the hardware test still
fails, retain the phone's `[IR]` / `[BLE]` logs and both boards' Serial output so a
radio disconnect can be distinguished from a board reset.
