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
    if (parsed && ['gunId', 'transmitter', 'receiver'].every(key =>
      typeof parsed[key] === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(parsed[key])) &&
      parsed.transmitter !== parsed.receiver) {
      return parsed;
    }
  } catch (e) {}
  return null;
}
