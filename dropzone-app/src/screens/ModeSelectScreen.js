import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ModeArtwork, { MODES } from '../components/ModeArtwork';
import { MotionEntrance, AmbientEffects } from '../components/PregameMotion';
import { PurpleBackdrop, BackButton, LockIcon, LIME } from '../components/PregameChrome';

export default function ModeSelectScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const safe = useSafeAreaInsets();
  const landscape = width > height;
  const cardWidth = landscape ? Math.min((width - safe.left - safe.right - 104) / 3.13, (height - safe.top - safe.bottom - 120) * 1.3, 420) : Math.min(width - 68, 420);
  const modes = Object.values(MODES);
  return <View style={styles.page}>
    <PurpleBackdrop />
    <AmbientEffects />
    <View style={[styles.header, { marginTop: Math.max(safe.top + 8, 16), marginLeft: Math.max(safe.left + 24, 32), marginRight: Math.max(safe.right + 24, 32) }]}>
      <BackButton onPress={() => navigation.goBack()} />
      <View><Text style={styles.eyebrow}>DROPZONE / PLAY</Text><Text style={styles.heading}>CHOOSE YOUR MODE</Text></View>
      <Text style={styles.count}>02 / 03 AVAILABLE</Text>
    </View>
    <ScrollView contentContainerStyle={[styles.cards, !landscape && styles.vertical]}>
      {modes.map((mode, index) => <MotionEntrance key={mode.id} delay={100 + index * 100}><Pressable key={mode.id} accessibilityRole="button" accessibilityLabel={`${mode.title}${mode.available ? ', play' : ', locked, coming soon'}`} accessibilityState={{ disabled: !mode.available }} disabled={!mode.available} onPress={() => mode.id === 'team' ? navigation.navigate('TeamParty') : navigation.navigate('Join', { mode: mode.id })} style={({ pressed }) => [styles.card, { width: cardWidth, height: cardWidth * 0.79, backgroundColor: mode.color }, mode.available && styles.available, pressed && { transform: [{ scale: 0.98 }] }]}>
        <View style={styles.art}><ModeArtwork kind={mode.id} /></View>
        {!mode.available && <View style={styles.locked}><LockIcon size={32} /><Text style={styles.coming}>COMING SOON</Text></View>}
        <View style={styles.cardFooter}>{cardWidth > 300 && <Text style={[styles.symbols, !mode.available && { color: 'rgba(255,255,255,0.4)' }]}>○ □ × △</Text>}<Text style={[styles.cardTitle, { fontSize: Math.max(12, cardWidth * 0.057), color: mode.available ? '#24113c' : '#fff' }]}>{mode.title}</Text><Text style={[styles.subtitle, !mode.available && { color: '#fff' }]}>{mode.subtitle}</Text></View>
      </Pressable></MotionEntrance>)}
    </ScrollView>
    <Text style={[styles.hint, { bottom: Math.max(safe.bottom + 14, 20) }]}>YOUR ARENA. YOUR RULES. ONE SURVIVOR.</Text>
  </View>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#4b00b1' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  eyebrow: { color: '#d9baff', fontSize: 9, fontWeight: '700', letterSpacing: 3 },
  heading: { color: '#fff', fontSize: 20, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1, marginTop: 3 },
  count: { marginLeft: 'auto', color: '#d9baff', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  cards: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, paddingHorizontal: 30, paddingVertical: 36 },
  vertical: { flexDirection: 'column', paddingBottom: 64 },
  card: { borderWidth: 4, borderColor: '#fff', borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden', shadowColor: '#170043', shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 7 },
  available: { transform: [{ scale: 1.07 }], borderColor: '#fff' },
  art: { position: 'absolute', top: 0, left: 0, right: 0, height: '78%' },
  locked: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  coming: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  cardFooter: { position: 'absolute', left: 14, right: 14, bottom: 13, alignItems: 'flex-end' },
  symbols: { alignSelf: 'flex-start', color: 'rgba(79,75,0,0.25)', fontSize: 18, position: 'absolute', bottom: 0, left: 0 },
  cardTitle: { fontWeight: '900', fontStyle: 'italic', textAlign: 'right', paddingBottom: 3 },
  subtitle: { color: '#435000', fontSize: 7, letterSpacing: 1, fontWeight: '800' },
  hint: { position: 'absolute', alignSelf: 'center', color: '#c4a1ed', fontSize: 8, fontWeight: '700', letterSpacing: 3 },
});
