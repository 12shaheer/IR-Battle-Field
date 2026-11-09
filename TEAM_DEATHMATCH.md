# Team Deathmatch

The player app, Unity runtime, local server, game-master app and transmitter firmware now support team parties and teammate first aid. No APK was built or replaced. The backend is deployed separately from the mobile apps; see `local-server/DEPLOYMENT.md`.

## Preview and party flow

From `dropzone-app`, run `npm run preview:pregame -- --rebuild`, then open http://localhost:4173. The launcher starts the local game API on port 4180. The browser preview exercises party assembly, gun-setup skip, lobby and first-aid UI; the existing Unity gameplay renderer runs on Android.

1. Play → Team Deathmatch creates or restores a party. A new player chooses a permanent username first.
2. The leader sees ten roster slots and an invite QR/manual party code. Other players select **Join a party**, scan that QR or enter its code, then complete their own gun setup. Each player can use the existing QR-only option.
3. Once 2–10 members are ready, the leader presses **Ready**, enters the match code and team name, and submits the entire team together. Ordinary members automatically follow into the lobby without entering a match code.
4. The game master creates a **Team Deathmatch** session and starts it once at least two teams are present. Capacity can be configured from 1–40; a playable match requires at least four players because each team needs two. A solo leader can assemble a party before inviting members.
5. Match completion returns the party to assembly on the next visit, preserving its members and rotating its invite.

The dark roster, lime header and lower-right Ready button follow the supplied screenshots. Zombies remains fully covered and locked. Home animation, Solo joining and the existing gun assets remain in place.

## Match rules and defaults

- Teams contain 2–10 players; the server accepts a whole team atomically and never exceeds 40 total players or the configured capacity.
- Friendly damage is rejected by the server and ignored by client targeting.
- Team kills decide the winner. Equal top scores produce a draw.
- Default duration is 20 minutes, configurable by the game master. TDM has no shrinking zone.
- Existing 60-second respawn remains. Each player receives one first-aid kit per match; respawn does not replenish it.

## First aid

Tap health → **Receive healing** or **Heal teammate**. Opening first aid disables firing immediately. The receiver gets a fresh private `DZHEAL:` QR, valid for 45 seconds while that receiving screen remains open. Closing/reopening invalidates the earlier code. Only a living teammate with an unused kit can redeem it; it cannot heal the scanner or an enemy.

A successful scan consumes the QR and starts a server-timed five-second interaction. Both players remain on the medical screen, cannot shoot or close it, and can still take damage. Movement and separation are allowed. The server grants no invulnerability. Completion restores the receiver to 100 HP and consumes the healer's kit. Death, match end or lost heartbeat cancels the heal without consuming the kit. An interrupted network connection therefore does not award healing.

The receiver's ordinary battle tag remains displayed during first aid so opponents using QR hit registration can still hit them. Native Android scans accept healing QR codes as well as ordinary battle tags. Unity's health-bar interaction, medical views, countdown and back-button lock are connected to the same server state.

## Hardware and deployment

The transmitter sketch at `firmware/blaster/blaster/blaster/blaster.ino` adds a writable BLE combat-lock characteristic (`64504f91-6444-4e50-85de-800a1828f3b1`). The app writes that lock on entering medical mode and restores it after reconnecting. **Flash this updated transmitter firmware to prevent the physical trigger from emitting IR during first aid.** The server rejects medical-mode attacks independently, but old firmware cannot disable the physical emitter. Firmware was compiled for ESP32-C3, not flashed.

Deploy `local-server/server.js` together with `team-mode.js` before using these features against production. Party credentials are private member tokens stored locally; public roster/session payloads contain no member tokens or healing tokens. Invites share only party access. State remains in memory, matching the existing server architecture: restarting the server clears matches and parties.

`EXPO_PUBLIC_API_URL` selects the API at export/build time. Player and game-master apps must use the same server. The preview launcher defaults to localhost:4180; installed apps retain the existing production default unless configured. For device testing, use a reachable LAN/HTTPS URL and the updated transmitter firmware.

## Validation

- 11 team-engine tests: membership limits, private credentials, leader/ready checks, atomic capacity, 40-player match, QR rotation/expiry/replay, teammate validation, healing timing, damage/death/disconnect, score/draw and party reuse.
- HTTP integration: two teams join/start; friendly fire and unauthorized requests are rejected; five-second medical lock preserves incoming damage; healing consumes one kit; team scoring/end work.
- 24 existing/player tests, including reconnect restoration of the physical combat lock.
- `dropzone-app/scripts/check-team-web.cjs` uses the real local API to verify leader entry, an ordinary member joining by party code, automatic lobby navigation, receiving QR, five-second UI lock and successful healing under fire. Browser exceptions: zero.
- Player and game-master Android JavaScript exports passed. Android `:app:compileReleaseJavaWithJavac` passed.
- Unity editor motion checks and ARM64 library compilation passed. This refreshes the embedded library without packaging an APK.
- ESP32-C3 transmitter compilation passed. Actual phone camera scanning, Bluetooth hardware interaction and multi-device latency still require device testing.

The existing `dropzone-app/dist/DropZone-Local.apk` remains unchanged (SHA256 `aca7752b21e4e7318976edb449948c439d7164cad4f40693d9eb0ba78867a4a2`).

## Building from a fresh checkout

The generated `dropzone-app/unity-export` directory is excluded from Git. With Unity 6000.5.6f1 and its Android tools installed, run `node scripts/refresh-unity-library.cjs` from `dropzone-app` before `npx expo prebuild --platform android --no-install`. The Unity source, artwork, native bridge and export scripts are versioned. This export step does not create an APK.
