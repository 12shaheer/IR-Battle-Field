let localBlocked = false;
export function setCombatBlocked(value) { localBlocked = !!value; }
export function isCombatBlocked() { return localBlocked; }
export function playerCombatBlocked(player) { return !!player?.medicalMode && player.medicalMode !== 'closed'; }
