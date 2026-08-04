import { Buffer } from 'buffer';
import { Platform, PermissionsAndroid } from 'react-native';
import { registerHit } from './combat';
import { bleManager } from './ble';
import { connectTagger, disconnectTagger, scanAndVerifyDevice } from './ir';
import { getPairedGun, clearPairedGun } from './gunPairing';

const SERVICE_UUID = '08dbb28a-ce2c-467a-9f12-4f15d574a220';
const HIT_CHAR_UUID = 'a95980fb-4f18-4b2e-a258-81bf77575117';

let rxDevice = null;
let hitSubscription = null;

function hashUsername(name) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < name.length; i++) {
    h = h ^ name.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h & 0xFFFFFF;
}

function buildUsernameHashMap(players) {
  const hashToPlayers = {};
  for (const p of players) {
    if (!p.displayName) continue;
    const hash = hashUsername(p.displayName);
    if (!hashToPlayers[hash]) {
      hashToPlayers[hash] = [];
    }
    hashToPlayers[hash].push(p);
  }

  for (const [hash, matched] of Object.entries(hashToPlayers)) {
    if (matched.length > 1) {
      console.warn(
        `[IR] HASH COLLISION: hash 0x${Number(hash).toString(16).padStart(6, '0')} ` +
        `matches ${matched.length} players: ${matched.map(p => p.displayName).join(', ')}`
      );
    }
  }

  return hashToPlayers;
}

async function requestBlePermissions() {
  if (Platform.OS !== 'android') return true;

  if (Platform.Version < 31) return true;

  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  ]);
  return Object.values(result).every(
    (v) => v === PermissionsAndroid.RESULTS.GRANTED
  );
}

let setupAborted = false;

export async function setupIRHardware({ players, myPlayerId, sessionId }) {
  setupAborted = false;

  const gun = getPairedGun();
  if (!gun) {
    console.log('[IR] No gun paired — IR hardware skipped');
    return;
  }

  const hasPermission = await requestBlePermissions();
  if (!hasPermission) {
    console.warn('[IR] BLE permissions denied — IR disabled');
    return;
  }

  const myPlayer = players.find(p => p.id === myPlayerId);
  if (!myPlayer?.displayName) {
    console.warn('[IR] No displayName found for local player — cannot init tagger');
    return;
  }

  const hashMap = buildUsernameHashMap(players);
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    if (setupAborted) return;

    console.log(`[IR] Connecting TX + RX (attempt ${attempt}/${MAX_RETRIES})`);

    try {
      // Connect to the transmitter (handles its own scan+verify)
      const txDevice = await connectTagger(myPlayer.displayName);
      if (setupAborted) return;

      if (!txDevice) {
        console.warn(`[IR] Could not connect to TX (attempt ${attempt}/${MAX_RETRIES})`);
        if (attempt < MAX_RETRIES) {
          await _delay(1000);
          continue;
        }
        console.warn('[IR] All TX connection attempts failed — IR disabled this round');
        return;
      }

      // Connect to the receiver
      console.log(`[IR-RX] Scanning for receiver ${gun.receiver}...`);
      rxDevice = await scanAndVerifyDevice(gun.receiver);
      if (setupAborted) return;

      if (!rxDevice) {
        console.warn(`[IR] Could not connect to RX (attempt ${attempt}/${MAX_RETRIES})`);
        if (attempt < MAX_RETRIES) {
          await _delay(1000);
          continue;
        }
        console.warn('[IR] All RX connection attempts failed — IR hit detection disabled');
        return;
      }

      // Subscribe to hit notifications on the receiver
      hitSubscription = rxDevice.monitorCharacteristicForService(
        SERVICE_UUID,
        HIT_CHAR_UUID,
        (err, characteristic) => {
          if (err) {
            console.error('[IR-RX] Hit notification error:', err);
            return;
          }
          if (!characteristic?.value) return;

          const rawData = Buffer.from(characteristic.value, 'base64');
          if (rawData.length < 4) {
            console.warn('[IR-RX] Hit notification too short:', rawData.length, 'bytes');
            return;
          }

          const shooterHash = (rawData[0] << 16) | (rawData[1] << 8) | rawData[2];
          const damage = rawData[3];

          const hashHex = '0x' + shooterHash.toString(16).padStart(6, '0');
          const matched = hashMap[shooterHash];

          if (!matched || matched.length === 0) {
            console.warn(`[IR-RX] HIT from unknown shooter (hash ${hashHex}) — no roster match`);
            return;
          }

          if (matched.length > 1) {
            console.warn(
              `[IR-RX] HIT hash ${hashHex} collides with ${matched.length} players — using first match`
            );
          }

          const shooter = matched[0];
          if (shooter.id === myPlayerId) return;

          console.log(
            `[IR-RX] HIT by "${shooter.displayName}" (hash ${hashHex}) for ${damage} damage`
          );

          registerHit({ sessionId, shooterId: shooter.id, targetId: myPlayerId });
        }
      );

      console.log('[IR] TX + RX connected — hit listener active');
      return;
    } catch (err) {
      console.error(`[IR] Setup error (attempt ${attempt}/${MAX_RETRIES}):`, err);
      if (attempt < MAX_RETRIES) {
        await _delay(1000);
      }
    }
  }

  console.warn('[IR] All setup attempts failed — IR disabled this round');
}

function _delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function teardownIRHardware() {
  setupAborted = true;
  bleManager.stopDeviceScan();
  if (hitSubscription) {
    hitSubscription.remove();
    hitSubscription = null;
  }
  disconnectTagger();
  if (rxDevice) {
    rxDevice.cancelConnection().catch(() => {});
    rxDevice = null;
  }
  clearPairedGun();
}
