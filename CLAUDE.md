# DropZone — AR Battle Royale

A real-world battle royale: players' phones are their guns. The camera feed is the
viewfinder, opponents wear QR "battle tags", and aiming your phone at someone's tag
lets you shoot *that specific player*. Physical hardware (an IR blaster + hit-detector
headband on M5StickC Plus / BLE) is planned as a premium input later — the game is
built so it plugs in without rewrites.

## Repo layout

| Folder | What it is | Stack |
|---|---|---|
| `dropzone-app/` | Player app (phone) | Expo SDK 54 / React Native |
| `dropzone-gm/` | Game Master dashboard (web, referee view) | Vite + React + Tailwind |
| `local-server/` | Game brain — sessions, players, hits, zone (in-memory) | Express + ws, port 3001 |
| `functions/` | UNUSED parallel Firebase implementation of the brain | Cloud Functions |

`firebase.json` / `firestore.rules` belong to the unused Firebase path; the app and GM
currently talk to `local-server` only.

## Running locally

```bash
# each folder needs its own install once
cd local-server && npm install && node server.js        # brain on :3001
cd dropzone-gm  && npm install && npm run dev           # dashboard on :5173
cd dropzone-app && npm install && npx expo start        # Metro on :8081 (Expo Go)
```

Phone must be on the same Wi-Fi as the machine running the brain.

**⚠ Hardcoded IP:** `dropzone-app/src/utils/firebase.js` pins `SERVER_URL`/`WS_URL` to
the host machine's LAN IP. It must match `ipconfig getifaddr en0` on the machine
running `local-server`, and it breaks whenever that IP changes (VPN, network switch).
Killing this is the main goal of the planned cloud migration.

**⚠ Never copy `node_modules` between machines** — macOS blocks foreign native
binaries (code-signature errors). Delete and `npm install` fresh.

## Core architecture: the hit-input "mailbox"

All ways of detecting a hit funnel through `dropzone-app/src/game/combat.js`:

- `registerHit({sessionId, shooterId, targetId})` — apply a hit whose target is known.
- `fireShot({sessionId, shooterId, players, targetId})` — a trigger pull; hits the
  aimed target or records a miss (`fireWeapon`) if none.

Game logic (health, elimination, kill feed) never knows *how* a hit was detected.
Current input: QR aiming. Planned input: BLE/IR hardware. Both call the same mailbox —
do not couple new input methods to game logic directly.

### QR aiming (current combat mechanic)

- `src/game/tags.js` — tag format: QR payload `DZ:<playerId>` (prefix filters out
  random real-world QR codes). Generator and scanner both import this file.
- `src/components/BattleTag.js` — renders a player's tag (shown in the lobby;
  players print it / show it on another screen and wear it).
- `src/game/targeting.js` — camera's short-term memory; sightings stay fresh 1.5s.
  Module-level store, not React state (scans arrive many times per second).
- `GameHUD.js` — `CameraView` scans QR codes and shows a TARGET LOCKED indicator
  (absolutely positioned: HUD popups must never join the crosshair's flex flow or
  they shift it).
- **No tag in sight ⇒ a shot is a miss.** Random-target selection was removed.

### Server quirk worth knowing

`local-server/server.js` `checkAndEndGame(sessionId, force)` — natural endings
require ≤1 player alive; the GM End Game button passes `force=true`. The server
responds `{success: true}` even when a call is a no-op, so verify state changes via
broadcasts, not response bodies.

## Testing multiplayer

Two phones in Expo Go, distinct player names. A phone in-game can't show its own tag
(camera is the gun), so screenshot the tag in the lobby and display it from Photos.
GM dashboard: create session → both join → start.

## Conventions

- Educational, step-by-step workflow: the project owner is non-technical and works
  with an AI pair; keep changes small, explained, and committed at working milestones.
- Do NOT add Co-Authored-By / attribution trailers to commits or PRs.
- Sounds live in `dropzone-app/src/assets/sounds/` — current files are synthesized
  placeholders (audible but rough), meant to be replaced with real SFX.
- `dropzone-app/AGENTS.md` (referenced by `dropzone-app/CLAUDE.md`): check the
  versioned Expo docs before writing Expo-dependent code.

## Roadmap (agreed with owner)

1. ✅ Stabilize (join race fix, audio fix, End Game fix)
2. ✅ QR battle-tag aiming (phone-only mode — permanent, not a stopgap)
3. ⏳ QR polish: in-game "show my tag", crosshair-precision aiming (tag must be
   centered — matches future IR feel)
4. ⏳ Cloud migration: host the brain online (the `functions/` folder is a head
   start), kill the hardcoded IP, enable friends-anywhere play
5. ⏳ Expo dev build (required for BLE) → closed beta
6. ⏳ IR/BLE hardware mode (M5StickC Plus blaster + Grove IR receiver headband) as a
   premium input calling the same mailbox
