import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ModeArtwork, { MODES } from '../components/ModeArtwork';
import { MotionEntrance, AmbientEffects } from '../components/PregameMotion';
import { PurpleBackdrop, BackButton, LockIcon, LIME } from '../components/PregameChrome';

export default function ModeSelectScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const safe = useSafeAreaInsets();
  const landscape = width > height;
  const gap = 40;
  const rowWidth = width - safe.left - safe.right - 64;
  const carousel = !landscape || (rowWidth - gap * 2) / 3 < 210;
  const cardWidth = carousel
    ? Math.min(width - safe.left - safe.right - 96, Math.max(160, (height - safe.top - safe.bottom - 190) * 1.3), 420)
    : Math.min((rowWidth - gap * 2) / 3, (height - safe.top - safe.bottom - 120) * 1.3, 420);
  const scroll = useRef(null);
  const [active, setActive] = useState(0);
  useEffect(() => { setActive(0);scroll.current?.scrollTo({ x: 0, y: 0, animated: false }); }, [width, height]);
  const modes = Object.values(MODES);
  return <View style={styles.page}>
    <PurpleBackdrop />
    <AmbientEffects />
    <View style={[styles.header, { marginTop: Math.max(safe.top + 8, 16), marginLeft: Math.max(safe.left + 24, 32), marginRight: Math.max(safe.right + 24, 32), gap: landscape ? 24 : 12 }]}>
      <BackButton onPress={() => navigation.goBack()} />
      <View><Text style={styles.eyebrow}>DROPZONE / PLAY</Text><Text style={[styles.heading, !landscape && { fontSize: 17 }]}>CHOOSE YOUR MODE</Text></View>
      {landscape && <Text style={styles.count}>02 / 03 AVAILABLE</Text>}
    </View>
    <ScrollView ref={scroll} horizontal={carousel} showsHorizontalScrollIndicator={false}
      snapToInterval={carousel ? cardWidth + gap : undefined} decelerationRate="fast" disableIntervalMomentum={carousel}
      onScroll={carousel ? event => setActive(Math.max(0, Math.min(modes.length - 1, Math.round(event.nativeEvent.contentOffset.x / (cardWidth + gap))))) : undefined}
      scrollEventThrottle={16} contentContainerStyle={[styles.cards, { gap }, carousel && { flexGrow: 0, paddingLeft: (width - cardWidth) / 2, paddingRight: (width - cardWidth) / 2, paddingBottom: 64 }]}>
      {modes.map((mode, index) => <MotionEntrance key={mode.id} delay={100 + index * 100}><Pressable key={mode.id} accessibilityRole="button" accessibilityLabel={`${mode.title}${mode.available ? ', play' : ', locked, coming soon'}`} accessibilityState={{ disabled: !mode.available }} disabled={!mode.available} onPress={() => mode.id === 'team' ? navigation.navigate('TeamParty') : navigation.navigate('Join', { mode: mode.id })} style={({ pressed }) => [styles.card, { width: cardWidth, height: cardWidth * 0.79, backgroundColor: mode.color }, mode.available && styles.available, pressed && { transform: [{ scale: 0.98 }] }]}>
        <View style={styles.art}><ModeArtwork kind={mode.id} /></View>
        {!mode.available && <View style={styles.locked}><LockIcon size={32} /><Text style={styles.coming}>COMING SOON</Text></View>}
        <View style={styles.cardFooter}>{cardWidth > 300 && <Text style={[styles.symbols, !mode.available && { color: 'rgba(255,255,255,0.4)' }]}>○ □ × △</Text>}<Text style={[styles.cardTitle, { fontSize: Math.max(12, cardWidth * 0.057), color: mode.available ? '#24113c' : '#fff' }]}>{mode.title}</Text><Text style={[styles.subtitle, !mode.available && { color: '#fff' }]}>{mode.subtitle}</Text></View>
      </Pressable></MotionEntrance>)}
    </ScrollView>
    {carousel && <View style={[styles.pager, { bottom: Math.max(safe.bottom + 38, 44) }]}>
      {modes.map((mode, index) => <Pressable key={mode.id} accessibilityRole="button" accessibilityLabel={`Show ${mode.title} mode`} accessibilityState={{ selected: active === index }} onPress={() => scroll.current?.scrollTo({ x: index * (cardWidth + gap), animated: true })} style={styles.pageButton}><View style={[styles.dot, active === index && styles.activeDot]} /></Pressable>)}
    </View>}
    <Text style={[styles.hint, { bottom: Math.max(safe.bottom + 14, 20) }]}>{carousel ? 'SWIPE TO EXPLORE GAME MODES' : 'YOUR ARENA. YOUR RULES. ONE SURVIVOR.'}</Text>
  </View>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#4b00b1' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  eyebrow: { color: '#d9baff', fontSize: 9, fontWeight: '700', letterSpacing: 3 },
  heading: { color: '#fff', fontSize: 20, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1, marginTop: 3 },
  count: { marginLeft: 'auto', color: '#d9baff', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  cards: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40, paddingHorizontal: 32, paddingVertical: 36 },
  pager: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center' },
  pageButton: { minWidth: 44, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#9370be' },
  activeDot: { width: 24, backgroundColor: LIME },
  card: { borderWidth: 4, borderColor: '#fff', borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden', shadowColor: '#170043', shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 7 },
  available: { borderColor: '#fff' },
  art: { position: 'absolute', top: 0, left: 0, right: 0, height: '78%' },
  locked: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  coming: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  cardFooter: { position: 'absolute', left: 14, right: 14, bottom: 13, alignItems: 'flex-end' },
  symbols: { alignSelf: 'flex-start', color: 'rgba(79,75,0,0.25)', fontSize: 18, position: 'absolute', bottom: 0, left: 0 },
  cardTitle: { fontWeight: '900', fontStyle: 'italic', textAlign: 'right', paddingBottom: 3 },
  subtitle: { color: '#435000', fontSize: 7, letterSpacing: 1, fontWeight: '800' },
  hint: { position: 'absolute', alignSelf: 'center', color: '#c4a1ed', fontSize: 8, fontWeight: '700', letterSpacing: 3 },
});
