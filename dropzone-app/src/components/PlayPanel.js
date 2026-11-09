import React, { useRef } from 'react';
import { Animated, Platform, Pressable, View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, ClipPath, LinearGradient, Stop, Path, Rect, Circle, Image as SvgImage } from 'react-native-svg';
import { LIME } from './PregameChrome';
import { useAmbientPhase, useReducedMotion } from './PregameMotion';

const banner = require('../../assets/pregame/play-banner.png');
// Follow the reference's rounded top banner, stepped lower-left edge,
// four controller symbols and separate rounded lime button underneath.
const bannerPath = 'M16 5H444Q455 5 455 16V82Q455 94 443 94H224Q218 94 214 100L190 128Q186 133 178 133H16Q5 133 5 122V16Q5 5 16 5Z';
export default function PlayPanel({ width, onPress }) {
  const phase = useAmbientPhase(3300);
  const reduced = useReducedMotion();
  const press = useRef(new Animated.Value(1)).current;
  const respond = value => Animated.spring(press, { toValue: value, speed: 22, bounciness: 5, useNativeDriver: Platform.OS !== 'web' }).start();
  return <Animated.View style={{ width, height: width * 185 / 460, transform: [{ translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }, { scale: press }] }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Play" onPress={onPress} onPressIn={() => respond(reduced ? 1 : 0.97)} onPressOut={() => respond(1)} onHoverIn={() => respond(reduced ? 1 : 1.025)} onHoverOut={() => respond(1)} style={styles.hitArea}>
      <Svg width="100%" height="100%" viewBox="0 0 460 185">
        <Defs>
          <ClipPath id="play-banner-clip"><Path d={bannerPath} /></ClipPath>
          <LinearGradient id="play-shade" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#13052d" stopOpacity="0.85" /><Stop offset="0.7" stopColor="#13052d" stopOpacity="0" /></LinearGradient>
        </Defs>
        <Path d="M17 8H443Q458 8 458 23V163Q458 180 441 180H17Q2 180 2 165V23Q2 8 17 8Z" fill="#25084b" stroke="#b088ef" strokeWidth="1.5" />
        <SvgImage href={banner} width="460" height="140" preserveAspectRatio="xMidYMid slice" clipPath="url(#play-banner-clip)" />
        <Path d={bannerPath} fill="url(#play-shade)" />
        <Path d={bannerPath} fill="none" stroke="#fff" strokeWidth="5" strokeLinejoin="round" />
        <Circle cx="27" cy="157" r="9" fill="none" stroke="#b8a0e3" strokeWidth="2.5" />
        <Rect x="47" y="148" width="18" height="18" rx="1" fill="none" stroke="#b8a0e3" strokeWidth="2.5" />
        <Path d="M80 148L98 166M98 148L80 166M120 146L131 166H109Z" fill="none" stroke="#b8a0e3" strokeWidth="2.5" strokeLinejoin="round" />
        <Rect x="236" y="111" width="207" height="63" rx="16" fill="#150827" opacity="0.8" />
        <Rect x="239" y="110" width="201" height="59" rx="14" fill={LIME} stroke="#efff8f" strokeWidth="2" />
      </Svg>
      <View pointerEvents="none" style={styles.bannerCopy}><Text style={[styles.kicker, { fontSize: width * 0.023 }]}>DROPZONE / ARENA</Text><Text style={[styles.title, { fontSize: width * 0.046 }]}>MAKE YOUR{ '\n' }NEXT MOVE.</Text></View>
      <View pointerEvents="none" style={styles.buttonCopy}><Text style={[styles.play, { fontSize: width * 0.065 }]}>PLAY</Text><Text style={[styles.chevron, { fontSize: width * 0.065 }]}>›</Text></View>
    </Pressable>
  </Animated.View>;
}
const styles = StyleSheet.create({
  hitArea: { flex: 1 }, bannerCopy: { position: 'absolute', left: '4.5%', top: '12%' },
  kicker: { color: LIME, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: '#fff', fontWeight: '900', fontStyle: 'italic', marginTop: 5, textShadowColor: '#160529', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  buttonCopy: { position: 'absolute', left: '53%', right: '5%', top: '59%', height: '32%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  play: { color: '#23103a', fontWeight: '900', fontStyle: 'italic', letterSpacing: 2 },
  chevron: { color: '#23103a', fontWeight: '800', lineHeight: 28 },
});
