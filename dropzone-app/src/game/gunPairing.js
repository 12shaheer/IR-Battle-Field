let pairedGun = null;

export function setPairedGun(gunConfig) {
  pairedGun = gunConfig;
}

export function getPairedGun() {
  return pairedGun;
}

export function clearPairedGun() {
  pairedGun = null;
}

export function parseGunQR(data) {
  try {
    const parsed = JSON.parse(data);
    if (parsed.gunId && parsed.transmitter && parsed.receiver) {
      return parsed;
    }
  } catch (e) {}
  return null;
}
