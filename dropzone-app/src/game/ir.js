import { isCombatBlocked } from './combatState';
import { Buffer } from 'buffer';
import { bleManager } from './ble';
import { getPairedGun } from './gunPairing';

export const TX_SERVICE_UUID = '08dbb28a-ce2c-467a-9f12-4f15d574a220';
const DEVICE_ID_CHAR_UUID = '1c9a1e2e-3d0a-4b3a-9a3a-2f3b4c5d6e7f';
const USERNAME_CHAR_UUID = '756ad6a4-2007-4dc4-9173-72dc7d6b2627';
const FIRE_CHAR_UUID = '8b91a0d2-5f7f-49cb-8939-4455d3d24b81';

const COMBAT_LOCK_CHAR_UUID = '64504f91-6444-4e50-85de-800a1828f3b1';
let hardwareLockDesired = null, lastLockDevice = null, lastLockValue = null;
let hardwareLockQueue = Promise.resolve();
let activeTxDevice = null;
export function setHardwareCombatLock(blocked) { hardwareLockDesired = !!blocked;return syncHardwareCombatLock(); }
function syncHardwareCombatLock() {
  const operation = hardwareLockQueue.then(async () => {
    const device = activeTxDevice, desired = hardwareLockDesired;
    if (!device || desired === null) return false;
    if (lastLockDevice === device.id && lastLockValue === desired) return true;
    await device.writeCharacteristicWithResponseForService(TX_SERVICE_UUID, COMBAT_LOCK_CHAR_UUID, Buffer.from([desired ? 1 : 0]).toString('base64'));
    if (activeTxDevice === device) { lastLockDevice = device.id;lastLockValue = desired; }
    return true;
  }).catch(error => { console.warn('[IR] Combat lock unavailable:', error.message);return false; });
  hardwareLockQueue = operation;return operation;
}
let writtenUsername = null;
let connectInProgress = null;
let generation = 0;
let scanQueue = Promise.resolve();
let cancelScan = null;
const verifiedDevices = new Map();

export function getActiveTxDevice() { return activeTxDevice; }
export function clearActiveTxDevice() {
  activeTxDevice = null;lastLockDevice = null;lastLockValue = null;
  writtenUsername = null;
}

export function cancelHardwareConnections() {
  generation++;
  cancelScan?.();
  for (const device of verifiedDevices.values()) {
    device.cancelConnection().catch(() => {});
  }
  verifiedDevices.clear();
  disconnectTagger();
}

export async function connectTagger(username) {
  if (connectInProgress) {
    await connectInProgress;
    return connectTagger(username);
  }
  const epoch = generation;
  const operation = (async () => {
    const gun = getPairedGun();
    if (!gun) return null;
    const device = await scanAndVerifyDevice(gun.transmitter, TX_SERVICE_UUID);
    if (epoch !== generation) return null;
    activeTxDevice = device;
    if (hardwareLockDesired !== null) await syncHardwareCombatLock();
    if (username && writtenUsername !== username) {
      // Firmware exposes PROPERTY_WRITE, requiring an acknowledged write.
      await device.writeCharacteristicWithResponseForService(
        TX_SERVICE_UUID, USERNAME_CHAR_UUID,
        Buffer.from(username, 'utf-8').toString('base64')
      );
      if (epoch !== generation) return null;
      writtenUsername = username;
    }
    return device;
  })();
  connectInProgress = operation;
  try { return await operation; }
  catch (error) {
    if (epoch === generation) clearActiveTxDevice();
    console.warn('[IR-TX] Connect failed:', error.message);
    return null;
  } finally {
    if (connectInProgress === operation) connectInProgress = null;
  }
}

export function scanAndVerifyDevice(expectedId, serviceUuid = TX_SERVICE_UUID) {
  const epoch = generation;
  const operation = scanQueue.then(async () => {
    if (epoch !== generation) throw new Error('BLE connection cancelled');
    const key = `${serviceUuid}:${expectedId}`;
    const cached = verifiedDevices.get(key);
    if (cached) {
      try { if (await cached.isConnected()) return cached; } catch (_) {}
    }
    verifiedDevices.delete(key);
    if (epoch !== generation) throw new Error('BLE connection cancelled');
    const device = await discoverDevice(expectedId, serviceUuid, epoch);
    if (epoch !== generation) {
      await device.cancelConnection().catch(() => {});
      throw new Error('BLE connection cancelled');
    }
    verifiedDevices.set(key, device);
    return device;
  });
  scanQueue = operation.catch(() => {});
  return operation;
}

function discoverDevice(expectedId, serviceUuid, epoch) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let candidate = null;
    let lastError = '';
    const finish = (error, device) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      bleManager.stopDeviceScan();
      cancelScan = null;
      if (error) {
        candidate?.cancelConnection().catch(() => {});
        reject(error);
      } else resolve(device);
    };
    const timeout = setTimeout(() => finish(new Error(`Timeout connecting to ${expectedId}. ${lastError || 'Check board power, firmware ID, Bluetooth and phone Location services.'}`)), 30000);
    cancelScan = () => finish(new Error('BLE connection cancelled'));
    const rejected = new Set();
    const scan = () => bleManager.startDeviceScan([serviceUuid], null, (error, device) => {
      if (settled) return;
      if (error) return finish(error);
      if (!device || candidate || rejected.has(device.id)) return;
      // Android may omit the scan-response name. The service filter identifies
      // the board type; its readable GATT ID remains the pairing authority.
      // Android can cache an older board name after reflashing. Never use that
      // name as identity: only the readable device ID can accept a connection.
      candidate = device;
      bleManager.stopDeviceScan();
      (async () => {
        try {
          const connected = await device.connect({ timeout: 10000 });
          if (settled || epoch !== generation) {
            await connected.cancelConnection().catch(() => {});
            return;
          }
          await connected.discoverAllServicesAndCharacteristics();
          const characteristic = await connected.readCharacteristicForService(serviceUuid, DEVICE_ID_CHAR_UUID);
          const actualId = Buffer.from(characteristic.value || '', 'base64').toString('utf-8');
          if (settled || epoch !== generation) {
            await connected.cancelConnection().catch(() => {});
            return;
          }
          if (actualId !== expectedId) {
            rejected.add(device.id);
            throw new Error(`Firmware ID mismatch: expected ${expectedId}, received ${actualId}`);
          }
          console.log(`[BLE] Verified ${expectedId} (${connected.id})`);
          finish(null, connected);
        } catch (error) {
          if (settled || epoch !== generation) return;
          await device.cancelConnection().catch(() => {});
          if (settled || epoch !== generation) return;
          lastError = error.message;
          candidate = null;
          console.warn(`[BLE] Could not verify ${expectedId}:`, error.message);
          scan();
        }
      })();
    });
    scan();
  });
}

export async function fireIR() {
  if (isCombatBlocked() || hardwareLockDesired === true) return false;
  // Only the hardware lifecycle reconnects. A trigger pull must never start a scan
  // or replay a shot after reconnecting (the first write may already have arrived).
  const device = activeTxDevice;
  if (!device) return false;
  try {
    await device.writeCharacteristicWithoutResponseForService(
      TX_SERVICE_UUID, FIRE_CHAR_UUID, Buffer.from([10]).toString('base64')
    );
    return true;
  } catch (error) {
    console.warn('[IR-TX] Fire failed:', error.message);
    return false;
  }
}

export function disconnectTagger() {
  const device = activeTxDevice;
  clearActiveTxDevice();
  device?.cancelConnection().catch(() => {});
}
