import { Buffer } from 'buffer';
import { bleManager } from './ble';
import { getPairedGun } from './gunPairing';

const SERVICE_UUID = '08dbb28a-ce2c-467a-9f12-4f15d574a220';
const DEVICE_ID_CHAR_UUID = '1c9a1e2e-3d0a-4b3a-9a3a-2f3b4c5d6e7f';
const USERNAME_CHAR_UUID = '756ad6a4-2007-4dc4-9173-72dc7d6b2627';
const FIRE_CHAR_UUID = '8b91a0d2-5f7f-49cb-8939-4455d3d24b81';

let activeTxDevice = null;
let usernameWritten = false;
let connectInProgress = null;

export async function connectTagger(username) {
  if (connectInProgress) {
    const device = await connectInProgress;
    if (device && !usernameWritten && username) {
      const usernameBase64 = Buffer.from(username, 'utf-8').toString('base64');
      await device.writeCharacteristicWithoutResponseForService(
        SERVICE_UUID,
        USERNAME_CHAR_UUID,
        usernameBase64
      );
      usernameWritten = true;
      console.log(`[IR-TX] Username written: ${username}`);
    }
    return device;
  }

  connectInProgress = _doConnect(username);
  try {
    return await connectInProgress;
  } finally {
    connectInProgress = null;
  }
}

async function _doConnect(username) {
  const gun = getPairedGun();
  if (!gun) {
    console.warn('[IR-TX] No gun paired — cannot connect transmitter');
    return null;
  }

  const expectedTxId = gun.transmitter;

  try {
    let isConnected = false;
    if (activeTxDevice) {
      isConnected = await activeTxDevice.isConnected();
    }

    if (!activeTxDevice || !isConnected) {
      console.log(`[IR-TX] Scanning for transmitter ${expectedTxId}...`);
      usernameWritten = false;

      activeTxDevice = await scanAndVerifyDevice(expectedTxId);
      if (!activeTxDevice) return null;
    }

    if (!usernameWritten && username) {
      const usernameBase64 = Buffer.from(username, 'utf-8').toString('base64');
      await activeTxDevice.writeCharacteristicWithoutResponseForService(
        SERVICE_UUID,
        USERNAME_CHAR_UUID,
        usernameBase64
      );
      usernameWritten = true;
      console.log(`[IR-TX] Username written: ${username}`);
    }

    return activeTxDevice;
  } catch (error) {
    console.error('[IR-TX] Connect error:', error.message);
    activeTxDevice = null;
    usernameWritten = false;
    return null;
  }
}

export async function scanAndVerifyDevice(expectedId) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const seen = new Set();

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      bleManager.stopDeviceScan();
      reject(new Error(`Timeout: Could not find device ${expectedId}`));
    }, 10000);

    bleManager.startDeviceScan([SERVICE_UUID], null, (error, device) => {
      if (settled) return;
      if (error) {
        settled = true;
        clearTimeout(timeout);
        bleManager.stopDeviceScan();
        return reject(error);
      }

      if (!device?.name?.startsWith('DropZone-')) return;
      if (seen.has(device.id)) return;
      seen.add(device.id);

      (async () => {
        try {
          const connected = await device.connect();
          await connected.discoverAllServicesAndCharacteristics();

          const idChar = await connected.readCharacteristicForService(
            SERVICE_UUID,
            DEVICE_ID_CHAR_UUID
          );
          const deviceId = Buffer.from(idChar.value, 'base64').toString('utf-8');

          if (deviceId === expectedId) {
            if (settled) {
              await connected.cancelConnection();
              return;
            }
            settled = true;
            clearTimeout(timeout);
            bleManager.stopDeviceScan();
            console.log(`[BLE] Verified device: ${deviceId}`);
            resolve(connected);
          } else {
            console.log(`[BLE] Device ${deviceId} does not match ${expectedId} — disconnecting`);
            await connected.cancelConnection();
          }
        } catch (err) {
          console.warn(`[BLE] Error verifying candidate ${device.name}:`, err.message);
        }
      })();
    });
  });
}

const DEFAULT_DAMAGE = 10;

export async function fireIR(username) {
  try {
    const device = await connectTagger(username);
    if (!device) return false;

    const base64Value = Buffer.from([DEFAULT_DAMAGE]).toString('base64');
    await device.writeCharacteristicWithoutResponseForService(
      SERVICE_UUID,
      FIRE_CHAR_UUID,
      base64Value
    );

    console.log('[IR-TX] FIRE sent');
    return true;
  } catch (error) {
    console.error('[IR-TX] Fire error:', error.message);
    activeTxDevice = null;
    usernameWritten = false;
    return false;
  }
}

export function disconnectTagger() {
  if (activeTxDevice) {
    activeTxDevice.cancelConnection().catch(() => {});
    activeTxDevice = null;
    usernameWritten = false;
  }
}
