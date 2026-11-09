import AsyncStorage from '@react-native-async-storage/async-storage';
import { callFunction } from '../utils/firebase';
const KEY = 'dropzone_team_party';
let saved = null;
export async function restoreParty() {
  const raw = await AsyncStorage.getItem(KEY);saved = raw ? JSON.parse(raw) : null;return saved;
}
export async function rememberParty(result) {
  if (result.credentials) saved = { ...result.credentials, sessionId: result.me?.sessionId || null, playerId: result.me?.playerId || null };
  else if (saved && result.me) saved = { ...saved, sessionId: result.me.sessionId, playerId: result.me.playerId };
  if (saved) await AsyncStorage.setItem(KEY, JSON.stringify(saved));
  return result;
}
export function teamAuth(sessionId) { return saved && (!sessionId || saved.sessionId === sessionId) ? { partyId: saved.partyId, memberId: saved.memberId, memberToken: saved.memberToken } : {}; }
export async function partyCall(action, data = {}) {
  const result = await callFunction(action, { ...teamAuth(), ...data });
  if (result.data.party) await rememberParty(result.data);
  return result.data;
}
export async function forgetParty() { saved = null;await AsyncStorage.removeItem(KEY); }
export function decodePartyInvite(value) { return typeof value === 'string' && /^DZPARTY:[A-Za-z0-9_-]{12,80}$/.test(value) ? value : null; }
