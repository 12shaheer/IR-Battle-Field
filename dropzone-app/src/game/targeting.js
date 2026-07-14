// Short-term memory for "who is in my sights right now?"
//
// The camera reports every battle tag it sees via tagSpotted(). A sighting
// stays fresh for a short window; when the trigger is pulled, whoever was
// seen most recently (and recently enough) is the target. If the window has
// lapsed — the enemy ducked away — the shot is a miss.
//
// This lives outside React state on purpose: scans arrive many times per
// second, and the trigger only needs the answer at the moment it's pulled.

const FRESH_MS = 1500;

let lastSighting = null; // { playerId, seenAt }

export function tagSpotted(playerId) {
  lastSighting = { playerId, seenAt: Date.now() };
}

// The playerId currently in our sights, or null if no fresh sighting.
export function getTargetInSight() {
  if (!lastSighting) return null;
  if (Date.now() - lastSighting.seenAt > FRESH_MS) return null;
  return lastSighting.playerId;
}

export function clearSighting() {
  lastSighting = null;
}
