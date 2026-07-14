import { callFunction } from '../utils/firebase';

// ─── The "mailbox" ───────────────────────────────────────────────────────────
// Every way of detecting a hit funnels through here. The game logic downstream
// only cares that a hit happened, its shooter, and its target — never HOW it was
// detected. Tap-to-shoot uses it today; QR aiming and the IR blaster will use the
// same entry points later without touching game logic.

// A hit whose shooter AND target are already known. QR/IR will call this
// directly, because they know exactly which player was hit.
export async function registerHit({ sessionId, shooterId, targetId }) {
  return callFunction('processHit', { sessionId, shooterId, targetId });
}

// A trigger pull. If the shooter had a valid enemy in their sights (targetId
// from the camera's QR scan), that exact player takes the hit. Otherwise the
// shot is a miss: ammo is spent via fireWeapon, but nobody is hurt.
export async function fireShot({ sessionId, shooterId, players, targetId }) {
  if (targetId) {
    const target = (players || []).find(
      (p) => p.id === targetId && p.id !== shooterId && p.status === 'alive'
    );
    if (target) {
      return registerHit({ sessionId, shooterId, targetId: target.id });
    }
  }

  return callFunction('fireWeapon', { sessionId, playerId: shooterId });
}
