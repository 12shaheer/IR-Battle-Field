// Shared format for player "battle tags".
// A tag QR encodes a player's id behind a short prefix, so the camera scanner
// can tell our tags apart from random QR codes it sees in the world.
// The generator (BattleTag) and the scanner (GameHUD) both import from here so
// they can never drift out of sync.

const PREFIX = 'DZ:'; // DropZone

export function encodeTag(playerId) {
  return `${PREFIX}${playerId}`;
}

// Returns the playerId encoded in a scanned QR string, or null if it isn't
// one of our tags.
export function decodeTag(data) {
  if (typeof data !== 'string' || !data.startsWith(PREFIX)) return null;
  const playerId = data.slice(PREFIX.length);
  return playerId || null;
}
