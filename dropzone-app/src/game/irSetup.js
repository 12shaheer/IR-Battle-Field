import { Buffer } from 'buffer';
import { Platform, PermissionsAndroid } from 'react-native';
import { isCombatBlocked, playerCombatBlocked } from './combatState';
import { registerHit, fireShot } from './combat';
import { getTargetInSight } from './targeting';
import { bleManager } from './ble';
import { TX_SERVICE_UUID, connectTagger, scanAndVerifyDevice, clearActiveTxDevice, cancelHardwareConnections } from './ir';
import { getPairedGun } from './gunPairing';
import { playSound } from '../utils/sounds';

export const RX_SERVICE_UUID = '7a3d1e09-b24f-4c8e-a649-83c2d5f17b30';
const TRIGGER_CHAR_UUID = 'd4e8f591-6b7a-4c3d-9e2f-1a8b3c5d7e9f';
const HIT_CHAR_UUID = 'a95980fb-4f18-4b2e-a258-81bf77575117';

let onTriggerFiredCallback = null;
let irActive = false;
let txConnected = false;
let rxConnected = false;
let bleStatus = 'disconnected';
let bleDisconnectedDevice = null;
const statusCallbacks = new Set();
let savedContext = null;
let lifecycle = null;
let setupInProgress = null;

function updateCombinedStatus() {
  if (txConnected && rxConnected) {
    bleStatus = 'connected';
    bleDisconnectedDevice = null;
    irActive = true;
  } else {
    irActive = false;
    if (!txConnected && !rxConnected) {
      bleStatus = 'disconnected';
      bleDisconnectedDevice = null;
    } else {
      bleStatus = 'connecting';
      bleDisconnectedDevice = !txConnected ? 'TX' : 'RX';
    }
  }
  for (const callback of statusCallbacks) callback(bleStatus, bleDisconnectedDevice);
}

export function getBleStatus() {
  return { status: bleStatus, device: bleDisconnectedDevice };
}

export function onBleStatusChange(callback) {
  statusCallbacks.add(callback);
  callback(bleStatus, bleDisconnectedDevice);
  return () => statusCallbacks.delete(callback);
}

export function isIRActive() {
  return irActive;
}

function hashUsername(name) {
  let h = 2166136261 >>> 0;
  for (const byte of Buffer.from(name, 'utf-8')) {
    h = h ^ byte;
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
  if (Platform.Version < 31) {
    return await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
      === PermissionsAndroid.RESULTS.GRANTED;
  }

  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    // The current manifest does not assert neverForLocation for BLE scans.
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  ]);
  return Object.values(result).every(
    (v) => v === PermissionsAndroid.RESULTS.GRANTED
  );
}

function setupTxSubscription(txDevice, { sessionId, myPlayerId, players }) {
  const run = lifecycle;
  return txDevice.monitorCharacteristicForService(
    TX_SERVICE_UUID,
    TRIGGER_CHAR_UUID,
    (err, characteristic) => {
      if (!isCurrent(run)) return;
      if (err) {
        console.error('[IR-TX] Trigger notification error:', err.message);
        notificationFailed(run, 'tx', txDevice, err);
        return;
      }
      if (!characteristic?.value) return;

      const me = savedContext?.players.find(p => p.id === myPlayerId);
      if (isCombatBlocked() || playerCombatBlocked(me)) return;
      console.log('[IR-TX] Physical trigger fired');
      if (!onTriggerFiredCallback) playSound('gunshot');

      fireShot({
        sessionId,
        shooterId: myPlayerId,
        players: savedContext?.players || players,
        targetId: getTargetInSight(),
      }).catch(error => console.warn('[IR] Shot rejected:', error.message));

      if (onTriggerFiredCallback) onTriggerFiredCallback();
    }
  );
}

function setupRxSubscription(rxDev, serviceUuid, { sessionId, myPlayerId, hashMap }) {
  const run = lifecycle;
  return rxDev.monitorCharacteristicForService(
    serviceUuid,
    HIT_CHAR_UUID,
    (err, characteristic) => {
      if (!isCurrent(run)) return;
      if (err) {
        console.error('[IR-RX] Hit notification error:', err.message);
        notificationFailed(run, 'rx', rxDev, err);
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
      const matched = (savedContext?.hashMap || hashMap)[shooterHash];

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

      registerHit({ sessionId, shooterId: shooter.id, targetId: myPlayerId })
        .catch(error => console.warn('[IR] Hit rejected:', error.message));
    }
  );
}

// Each board owns its subscription, disconnect listener, and retry timer.
// A lifecycle token prevents late async completions from reviving a finished game.
function isCurrent(run) { return lifecycle === run && !run.stopped; }

function notificationFailed(run, role, device, error) {
  // Defer until monitorCharacteristicForService has returned its subscription.
  Promise.resolve().then(() => {
    if (!isCurrent(run) || run[role].device !== device) return;
    lost(run, role, error);
    device.cancelConnection().catch(() => {});
  });
}

function publish(run) {
  if (!isCurrent(run)) return;
  txConnected = !!run.tx.device;
  rxConnected = !!run.rx.device;
  updateCombinedStatus();
}

function removeListeners(slot) {
  slot.subscription?.remove();
  slot.disconnect?.remove();
  slot.subscription = null;
  slot.disconnect = null;
}

function retry(run, role) {
  const slot = run[role];
  if (!isCurrent(run) || slot.timer || slot.busy || slot.device) return;
  const delay = Math.min(1000 * 2 ** Math.min(slot.attempt++, 4), 10000);
  slot.timer = setTimeout(() => {
    slot.timer = null;
    connectRole(run, role);
  }, delay);
}

function lost(run, role, error) {
  if (!isCurrent(run)) return;
  const slot = run[role];
  console.warn(`[IR-${role.toUpperCase()}] Disconnected:`, error?.message || 'link closed');
  removeListeners(slot);
  slot.device = null;
  if (role === 'tx') clearActiveTxDevice();
  publish(run);
  retry(run, role);
}

async function connectRole(run, role) {
  const slot = run[role];
  if (!isCurrent(run) || slot.busy || slot.device) return;
  slot.busy = true;
  let device;
  try {
    device = role === 'tx'
      ? await connectTagger(savedContext.username)
      : await scanAndVerifyDevice(savedContext.gun.receiver, RX_SERVICE_UUID);
    if (!isCurrent(run)) return;
    if (!device) throw new Error('Board unavailable');
    slot.device = device;
    slot.disconnect = bleManager.onDeviceDisconnected(device.id, error => lost(run, role, error));
    slot.subscription = role === 'tx'
      ? setupTxSubscription(device, savedContext)
      : setupRxSubscription(device, RX_SERVICE_UUID, savedContext);
    // Cover a disconnect that occurred between discovery and listener registration.
    if (!await device.isConnected()) throw new Error('Link lost during setup');
    if (!isCurrent(run) || slot.device !== device) return;
    slot.attempt = 0;
    publish(run);
  } catch (error) {
    if (!isCurrent(run)) return;
    removeListeners(slot);
    slot.device = null;
    if (role === 'tx') clearActiveTxDevice();
    await device?.cancelConnection().catch(() => {});
    console.warn(`[IR-${role.toUpperCase()}] Connect failed:`, error.message);
    publish(run);
  } finally {
    slot.busy = false;
    retry(run, role);
  }
}

export function setupIRHardware(args) {
  const myPlayer = args.players.find(player => player.id === args.myPlayerId);
  if (!myPlayer?.displayName || !getPairedGun()) return Promise.resolve();
  if (lifecycle && (savedContext.sessionId !== args.sessionId || savedContext.myPlayerId !== args.myPlayerId)) {
    teardownIRHardware();
  }
  onTriggerFiredCallback = args.onTriggerFired || null;
  savedContext = { ...args, username: myPlayer.displayName,
    hashMap: buildUsernameHashMap(args.players), gun: getPairedGun() };
  if (lifecycle) return setupInProgress || Promise.resolve();
  const run = { stopped: false,
    tx: { device: null, attempt: 0, busy: false },
    rx: { device: null, attempt: 0, busy: false } };
  lifecycle = run;
  bleStatus = 'connecting';
  for (const callback of statusCallbacks) callback(bleStatus, null);
  const operation = (async () => {
    if (!await requestBlePermissions() || !isCurrent(run)) {
      if (isCurrent(run)) teardownIRHardware();
      return;
    }
    // The scanner serializes discovery; failures are independent per board.
    await Promise.all([connectRole(run, 'tx'), connectRole(run, 'rx')]);
  })().catch(error => {
    console.warn('[IR] Setup failed:', error.message);
    if (isCurrent(run)) teardownIRHardware();
  }).finally(() => {
    if (setupInProgress === operation) setupInProgress = null;
  });
  setupInProgress = operation;
  return operation;
}

export function teardownIRHardware() {
  const run = lifecycle;
  lifecycle = null;
  if (run) {
    run.stopped = true;
    for (const slot of [run.tx, run.rx]) {
      clearTimeout(slot.timer);
      removeListeners(slot);
    }
  }
  cancelHardwareConnections();
  savedContext = null;
  setupInProgress = null;
  onTriggerFiredCallback = null;
  txConnected = false;
  rxConnected = false;
  updateCombinedStatus();
}
