import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useGame } from '../context/GameContext';
import useMedical from '../game/useMedical';
import MedicalOverlay from './MedicalOverlay';
import { MODES } from './ModeArtwork';
import { CinematicBackdrop } from './PregameMotion';
import { LIME } from './PregameChrome';
export default function TeamGameWeb() {
  const game = useGame(), medical = useMedical(game);
  const player = game.playerData, team = game.sessionData?.teams?.[player?.teamId];
  return <View style={styles.page}><CinematicBackdrop source={MODES.team.image} />
    <View style={styles.top}><Text style={styles.name}>{team?.name} · {team?.score || 0} TEAM KILLS</Text><Text style={styles.note}>BROWSER VIEW · Unity gameplay runs in the Android app.</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Open first aid" onPress={() => medical.action('menu')} style={styles.health}><Text style={styles.value}>{player?.health || 0} / 100 HP</Text><Text style={styles.name}>{player?.displayName}</Text><Text style={styles.note}>FIRST AID · {player?.medkits || 0} KIT</Text></Pressable>
    <MedicalOverlay medical={medical} player={player} />
  </View>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#151323' }, top: { position: 'absolute', top: 22, left: 26, padding: 15, backgroundColor: 'rgba(10,7,23,0.85)', borderRadius: 9, gap: 6 }, name: { color: '#fff', fontWeight: '900', fontSize: 14 }, note: { color: '#bdb2cc', fontSize: 10 }, health: { position: 'absolute', left: 26, bottom: 34, gap: 8, padding: 22, backgroundColor: 'rgba(10,7,23,0.9)', borderRadius: 12, borderWidth: 1, borderColor: LIME }, value: { color: LIME, fontWeight: '900', fontSize: 30 } });
