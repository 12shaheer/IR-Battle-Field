import { useCallback, useEffect, useRef, useState } from 'react';
import { callFunction } from '../utils/firebase';
import { teamAuth } from './teamParty';
import { setHardwareCombatLock } from './ir';
import { setCombatBlocked } from './combatState';

export default function useMedical(game) {
  const [mode, setMode] = useState('closed'), [offer, setOffer] = useState(null), [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const busy = useRef(false), current = useRef(game), offset = useRef(0), modeRef = useRef(mode);
  modeRef.current = mode;
  useEffect(() => () => {
    const g = current.current;
    if (g.sessionData?.mode === 'team' && modeRef.current !== 'closed' && modeRef.current !== 'healing') {
      callFunction('setMedicalMode', { sessionId: g.sessionId, playerId: g.playerId, ...teamAuth(g.sessionId), mode: 'closed' }).catch(() => {});
    }
  }, []);
  current.current = game;
  useEffect(() => { const value = game.playerData?.medicalMode || 'closed';setMode(value);if (value !== 'receive') setOffer(null); }, [game.playerData?.medicalMode]);
  useEffect(() => { setCombatBlocked(mode !== 'closed');if (game.sessionData?.mode === 'team') setHardwareCombatLock(mode !== 'closed');return () => setCombatBlocked(false); }, [mode, game.sessionData?.mode]);
  useEffect(() => { if (mode === 'closed') return;const timer = setInterval(() => setNow(Date.now()), 200);return () => clearInterval(timer); }, [mode]);
  const action = useCallback(async next => {
    if (busy.current) return;
    const g = current.current;
    if (g.sessionData?.mode !== 'team' || !g.sessionId || !g.playerId) return;
    if (g.playerData?.medicalMode === 'healing') return;
    busy.current = true;setError('');
    setCombatBlocked(true);setHardwareCombatLock(true);
    if (next !== 'closed') setMode(next);
    try {
      const result = await callFunction('setMedicalMode', { sessionId: g.sessionId, playerId: g.playerId, ...teamAuth(g.sessionId), mode: next });
      offset.current = result.data.serverNow - Date.now();
      setOffer(result.data.qr ? result.data : null);setMode(result.data.mode);setCombatBlocked(result.data.mode !== 'closed');setHardwareCombatLock(result.data.mode !== 'closed');
    } catch (e) { setError(e.message); }
    finally { busy.current = false; }
  }, []);
  const scan = useCallback(async qr => {
    if (busy.current || !qr?.startsWith('DZHEAL:')) return;
    const g = current.current;
    if (g.playerData?.medicalMode !== 'scan') return;
    busy.current = true;setError('');
    try {
      const result = await callFunction('startHeal', { sessionId: g.sessionId, playerId: g.playerId, ...teamAuth(g.sessionId), qr });
      offset.current = result.data.serverNow - Date.now();setMode('healing');setOffer(null);
    } catch (e) { setError(e.message); }
    finally { busy.current = false; }
  }, []);
  return { mode, offer, error, action, scan,
    remaining: Math.max(0, ((game.playerData?.healUntil || 0) - (now + offset.current)) / 1000),
    expiresIn: Math.max(0, ((offer?.expiresAt || 0) - (now + offset.current)) / 1000) };
}
