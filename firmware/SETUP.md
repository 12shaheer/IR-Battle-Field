# DropZone IR Hardware — Arduino IDE Setup

## Hardware

| Role | Board | IR Pin | Notes |
|------|-------|--------|-------|
| Blaster | ESP32-C3 SuperMini | GPIO 4 (IR LED) | Sends NEC signal with player number |
| Receiver | ESP32-C3 SuperMini | GPIO 10 (IR receiver) | TSOP-style 38kHz module |

Each player needs one blaster (trigger) and one receiver (worn on body/head).

---

## Arduino IDE Setup

### 1. Board Support

1. **File → Preferences** → Additional Board Manager URLs:
   ```
   https://dl.espressif.com/dl/package_esp32_index.json
   ```
2. **Tools → Board → Board Manager** → search "esp32" → install **esp32 by Espressif Systems** (v2.x or 3.x)

### 2. Board Selection

- **Tools → Board → esp32 → ESP32C3 Dev Module**
- **Tools → USB CDC On Boot → Enabled** (for Serial Monitor)
- **Tools → Upload Speed → 921600**
- **Tools → Port → (your USB serial port)**

### 3. Libraries

**Sketch → Include Library → Manage Libraries:**

| Library | Version | Notes |
|---------|---------|-------|
| **IRremote** | 4.x | by shirriff/z3t0/ArminJo — NEC send/receive |

BLE is built into the ESP32 board package (no extra install).

### 4. Upload

1. Plug in the **blaster** board → open `firmware/blaster/blaster.ino` → Upload
2. Plug in the **receiver** board → open `firmware/receiver/receiver.ino` → Upload

---

## Signal Protocol

```
PHONE (SHOOT tap)
  │── BLE write (1 byte: playerNumber) ──→  BLASTER ESP32-C3
                                               │── NEC IR (addr=0x00, cmd=playerNumber) × 3 bursts
                                               ↓
                                            RECEIVER ESP32-C3
  PHONE (target) ←── BLE notify (1 byte: shooterNumber) ──│
  │── registerHit(shooterId, targetId) ──→  SERVER
```

- **NEC address `0x00`** — identifies DropZone signals, filters out TV remotes
- **NEC command** — the shooter's player number (1–255)
- **3 bursts** — redundancy for reliability
- **1-second cooldown** on receiver — prevents triple-counting one shot

### BLE Device Names

| Device | Advertised Name | The app scans for this |
|--------|-----------------|------------------------|
| Blaster | `LaserTag-Blaster` | Phone writes playerNumber to fire |
| Receiver | `LaserTag-Receiver` | Phone subscribes to hit notifications |

### BLE UUIDs

| UUID | Role |
|------|------|
| `12345678-1234-1234-1234-123456789abc` | Service (both devices) |
| `12345678-1234-1234-1234-123456789ab1` | Blaster characteristic (write) |
| `12345678-1234-1234-1234-123456789ab2` | Receiver characteristic (notify) |

---

## Wiring

### Blaster
- IR LED anode → GPIO 4 (through appropriate resistor)
- IR LED cathode → GND

### Receiver
- TSOP4838 / VS1838B (38kHz IR receiver module):
  - VCC → 3.3V
  - GND → GND
  - Signal → GPIO 10

---

## Testing

1. Upload both firmwares
2. Open Serial Monitor (115200 baud) on each board
3. Point the blaster at the receiver
4. Send a BLE write of value `0x01` to the blaster (or use nRF Connect app to test)
5. Receiver Serial Monitor should print: `HIT REGISTERED! Shooter Player #: 1`

Without a phone, you can test IR only by temporarily adding a button trigger to the blaster's loop:

```cpp
// Add to blaster loop() for testing without BLE:
if (digitalRead(9) == LOW) {  // button on GPIO 9
  IrSender.sendNEC(0x00, 1, 0);  // fire as player #1
  delay(500);
}
```

---

## Player Number Assignment

The server assigns `playerNumber` (1–255) to each player when they join. The phone:
1. Stores the full mapping (playerNumber → playerId) 
2. Writes its own playerNumber to the blaster when shooting
3. Looks up the shooterNumber from the receiver to find who hit them

This means the IR signal only carries a small number, but the server knows the full identity.
