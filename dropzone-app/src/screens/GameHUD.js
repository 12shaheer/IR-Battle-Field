import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useGame } from '../context/GameContext';
import { setupIRHardware, teardownIRHardware } from '../game/irSetup';
import { presentUnity } from '../game/unityBridge';
import UnityGameplay from '../components/UnityGameplay';
import TeamGameWeb from '../components/TeamGameWeb';
import { isCombatBlocked, playerCombatBlocked } from '../game/combatState';
import { setHardwareCombatLock } from '../game/ir';

export default function GameHUD({ navigation }) {
  const { sessionId, playerId, playerData, sessionData, players, recentEvents } = useGame();
  const previousEvents = useRef(new Set());
  const hardwareShot = useCallback(() => { if (!isCombatBlocked()) presentUnity('PresentShot'); }, []);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT).catch(() => {});
  }, []);
  useEffect(() => {
    if (sessionId && playerId && players.length) setupIRHardware({ players, myPlayerId: playerId, sessionId, onTriggerFired: hardwareShot });
  }, [sessionId, playerId, players, hardwareShot]);
  useEffect(() => { setHardwareCombatLock(playerCombatBlocked(playerData)); }, [sessionData?.mode, playerData?.medicalMode]);
  useEffect(() => {
    for (const event of recentEvents) {
      if (!event.id || previousEvents.current.has(event.id) || event.actorId !== playerId) continue;
      if (event.type === 'hit' || event.type === 'kill') presentUnity('PresentHit', event.type);
    }
    previousEvents.current = new Set(recentEvents.map(event => event.id));
  }, [recentEvents, playerId]);
  useEffect(() => {
    if (sessionData?.status === 'ended') { teardownIRHardware(); navigation.replace('Results'); }
    else if (playerData?.status === 'eliminated' || playerData?.health === 0) navigation.replace('Eliminated');
  }, [sessionData?.status, playerData?.status, playerData?.health, navigation]);
  useEffect(() => () => { setHardwareCombatLock(false); }, []);
  // Unity is the gameplay renderer. No second camera or legacy HUD is mounted.
  return <View style={styles.screen}>{Platform.OS === 'web' && sessionData?.mode === 'team' ? <TeamGameWeb /> : <UnityGameplay navigation={navigation} />}</View>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#09141e' } });
