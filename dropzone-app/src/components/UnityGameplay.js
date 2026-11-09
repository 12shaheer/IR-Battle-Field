import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useGame } from '../context/GameContext';
import { unityAvailable, launchUnity, updateUnity, onUnityEvent, presentUnity } from '../game/unityBridge';
import { fireShot } from '../game/combat';
import { fireIR } from '../game/ir';
import { decodeTag, encodeTag } from '../game/tags';
import { getBleStatus, onBleStatusChange } from '../game/irSetup';
import { getPairedGun } from '../game/gunPairing';
import { tagSpotted, getTargetInSight } from '../game/targeting';
import useMedical from '../game/useMedical';
import { teamAuth } from '../game/teamParty';
import { isCombatBlocked, playerCombatBlocked } from '../game/combatState';
import HealingQrExporter from './HealingQrExporter';
import { callFunction } from '../utils/firebase';

export default function UnityGameplay({ navigation }) {
  const game = useGame();
  const medical = useMedical(game);
  const medicalRef = useRef(medical);medicalRef.current = medical;
  const [healingQr, setHealingQr] = useState(null);
  const current = useRef(game); current.current = game;
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [lockedTarget, setLockedTarget] = useState('');
  const targetTimer = useRef(null);
  useEffect(() => () => clearTimeout(targetTimer.current), []);
  const active = phase === 'launching' || phase === 'ready';
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [battleTag, setBattleTag] = useState(null);
  const [hardware, setHardware] = useState(getBleStatus);
  const tagRef = useRef(null);
  const tagOwner = useRef(game.playerId); tagOwner.current = game.playerId;
  const exportTag = useCallback(node => { tagRef.current = node; }, []);
  useEffect(() => {
    setBattleTag(null);
    if (!game.playerId) return;
    const owner = game.playerId;
    let cancelled = false, delivered = false, attempts = 0, timer;
    const watchdog = setTimeout(() => { if (!cancelled && !delivered) { setError('Battle-tag generation timed out. Please retry.'); setPhase('error'); } }, 5000);
    const exportPng = () => {
      if (cancelled) return;
      if (!tagRef.current && attempts++ < 30) { timer = setTimeout(exportPng, 100); return; }
      if (!tagRef.current) { setError('Could not prepare your battle tag. Try again.'); setPhase('error'); return; }
      try { tagRef.current.toDataURL(png => {
        if (!cancelled && tagOwner.current === owner) { delivered=true; clearTimeout(watchdog); setBattleTag({ owner, png }); }
      }); } catch (e) { setError(e.message); setPhase('error'); }
    };
    timer = setTimeout(exportPng, 100);
    return () => { cancelled = true; clearTimeout(timer); clearTimeout(watchdog); };
  }, [game.playerId, attempt]);
  useEffect(() => onBleStatusChange((status, device) => setHardware({ status, device })), []);
  const busy = useRef(false);
  const makeState = () => ({ health: current.current.playerData?.health ?? 100,
    ammo: current.current.playerData?.ammo ?? 0, displayName: current.current.playerData?.displayName || 'PLAYER',
    ended: current.current.sessionData?.status === 'ended', eliminated: current.current.playerData?.status === 'eliminated',
    maxHealth: current.current.playerData?.maxHealth ?? current.current.sessionData?.maxHealth ?? 100,
    armor: current.current.playerData?.armor ?? -1,
    alive: current.current.players.filter(p => p.status === 'alive').length,
    nextShrinkAt: String(current.current.sessionData?.nextShrinkAt || ''),
    teamMode: current.current.sessionData?.mode === 'team', teamName: current.current.playerData?.teamName || '',
    teamScore: current.current.sessionData?.teams?.[current.current.playerData?.teamId]?.score || 0,
    medkits: current.current.playerData?.medkits || 0, medicalMode: medical.mode, medicalError: medical.error, healRemaining: medical.remaining,
    healQrPng: healingQr && healingQr.value === medical.offer?.qr ? healingQr.png : '',
    lockedTarget,
    battleTagPng: battleTag?.owner === current.current.playerId ? battleTag.png : '',
    hasHardware: !!getPairedGun(), hardwareStatus: hardware.status, hardwareDevice: hardware.device || '', serverConnected: current.current.isConnected });
  const stateBuilder = useRef(makeState); stateBuilder.current = makeState;

  useEffect(() => onUnityEvent(async event => {
    const g = current.current;
    if (event.type === 'error') { setError(event.value || 'Unity failed to start'); setPhase('error'); return; }
    if (event.type === 'ready') { setPhase('ready'); return; }
    if (event.type === 'medical') { medicalRef.current.action(event.value);return; }
    if (event.type === 'closed') { medicalRef.current.action('closed'); setPhase(value => value === 'error' ? 'error' : 'closed'); return; }
    if (event.type === 'qr') {
      if (event.value?.startsWith('DZHEAL:')) { medicalRef.current.scan(event.value);return; }
      if (isCombatBlocked()) return;
      const id = decodeTag(event.value);
      const target=g.players.find(p => p.id === id && p.id !== g.playerId && p.status === 'alive' && (!g.playerData?.teamId || p.teamId !== g.playerData.teamId));
      if(target) { tagSpotted(id); setLockedTarget(target.displayName || 'PLAYER'); clearTimeout(targetTimer.current); targetTimer.current=setTimeout(() => setLockedTarget(''),1500); }
      return;
    }
    if (isCombatBlocked() || playerCombatBlocked(g.playerData)) return;
    if (!['fire', 'reload'].includes(event.type) || busy.current || !g.sessionId || !g.playerId || g.playerData?.status !== 'alive' || g.sessionData?.status === 'ended') return;
    if (event.type === 'fire' && !(g.playerData?.ammo > 0)) return;
    busy.current = true;
    try {
      if (event.type === 'fire') {
        presentUnity('PresentShot');
        fireIR().catch(error => console.warn('[Unity] Hardware fire:', error.message));
        await fireShot({ sessionId: g.sessionId, shooterId: g.playerId, players: g.players, targetId: getTargetInSight() });
      } else {
        // The server remains authoritative; animation does not grant ammunition.
        presentUnity('PresentReload');
        await callFunction('reloadAmmo', { sessionId: g.sessionId, playerId: g.playerId, ...teamAuth(g.sessionId) });
      }
    } catch (error) { console.warn('[Unity] Combat request failed:', error.message); }
    finally { busy.current = false; if(mounted.current && current.current.sessionId===g.sessionId && current.current.playerId===g.playerId)updateUnity(stateBuilder.current()); }
  }), []);

  useEffect(() => { if (active) updateUnity(stateBuilder.current()); }, [active, game.playerData, game.sessionData, game.isConnected, battleTag, hardware, lockedTarget, medical.mode, medical.error, medical.remaining, healingQr]);
  useEffect(() => () => { presentUnity('ExitGameplay'); }, []);

  useEffect(() => {
    if (phase !== 'idle' || battleTag?.owner !== game.playerId || !game.sessionId || !game.playerId) return;
    if (!unityAvailable) { setError('This installed app does not contain the Unity runtime. A native update is required.'); setPhase('error'); return; }
    setPhase('launching');
    launchUnity(stateBuilder.current()).then(() => {
      if (mounted.current) setPhase('ready');
    }).catch(e => { if (mounted.current) { setError(e.message); setPhase('error'); } });
  }, [phase, battleTag, game.playerId, game.sessionId]);

  const retry = () => { setError(null); setAttempt(value => value+1); setPhase('idle'); };

  return <View style={styles.screen}>
    {medical.offer?.qr && <HealingQrExporter value={medical.offer.qr} onPng={setHealingQr} />}
    {game.playerId && <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.hiddenTag}>
      <QRCode key={game.playerId} value={encodeTag(game.playerId)} size={160} quietZone={12} getRef={exportTag} />
    </View>}
    {(phase === 'idle' || phase === 'launching') && <ActivityIndicator size="large" color="#39d8ef" />}
    <Text style={styles.title}>{phase === 'error' ? 'GAMEPLAY COULD NOT START' : phase === 'closed' ? 'GAMEPLAY PAUSED' : phase === 'ready' ? 'RETURNING TO GAMEPLAY' : 'STARTING DROPZONE'}</Text>
    <Text style={styles.detail}>{error || (phase === 'closed' ? 'Resume the Unity gameplay view or return to the lobby.' : 'Preparing your camera, weapon and battle tag…')}</Text>
    {(phase === 'error' || phase === 'closed' || phase === 'ready') && <TouchableOpacity style={styles.button} onPress={retry}><Text style={styles.text}>RETRY GAMEPLAY</Text></TouchableOpacity>}
    <TouchableOpacity style={styles.button} onPress={() => { presentUnity('ExitGameplay'); navigation.replace('Lobby'); }}><Text style={styles.text}>RETURN TO LOBBY</Text></TouchableOpacity>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#09141e' },
  hiddenTag: { position: 'absolute', opacity: 0, width: 184, height: 184 },
  title: { color: '#e9faff', fontSize: 19, fontWeight: '700', letterSpacing: 2, marginTop: 16 },
  detail: { color: '#95b3c5', textAlign: 'center', marginVertical: 12, maxWidth: 500 },
  button: { backgroundColor: '#102c36', paddingHorizontal: 18, paddingVertical: 12, marginTop: 8, borderWidth: 1, borderColor: '#39d8ef' },
  text: { color: '#c6faff', fontSize: 12, letterSpacing: 1 },
});
