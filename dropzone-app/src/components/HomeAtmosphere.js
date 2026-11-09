import React, { useCallback, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle, Ellipse, Defs, RadialGradient, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useAmbientPhase, useReducedMotion } from './PregameMotion';

function useOrbit(duration) {
  const value = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  useFocusEffect(useCallback(() => {
    value.setValue(0);
    if (reduced) return;
    const animation = Animated.loop(Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web', isInteraction: false }), { iterations: -1, resetBeforeIteration: true });
    animation.start();return () => animation.stop();
  }, [value, duration, reduced]));
  return value;
}

// Holographic layers sit over the original home artwork. All continuous
// animation uses transforms/opacity, native looping on mobile, and stops off-screen.
export default function HomeAtmosphere() {
  const { width, height } = useWindowDimensions();
  const orbit = useOrbit(5400);
  const scan = useOrbit(3800);
  const pulse = useAmbientPhase(1650);
  const scale = Math.max(width / 1376, height / 768);
  const centerX = width / 2 + 12 * scale;
  const y = position => height / 2 + (position - 384) * scale;
  const chamberWidth = 360 * scale;
  const chamberTop = y(140);
  const chamberHeight = 425 * scale;
  const floorY = y(584);
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.layer}>
    <Animated.View style={[styles.glow, { left: centerX - chamberWidth * 0.7, top: chamberTop - 60 * scale, width: chamberWidth * 1.4, height: chamberHeight + 120 * scale, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.58] }) }]}>
      <Svg width="100%" height="100%"><Defs><RadialGradient id="home-core"><Stop offset="0" stopColor="#a4ffff" stopOpacity="0.48" /><Stop offset="0.45" stopColor="#16dfff" stopOpacity="0.18" /><Stop offset="1" stopColor="#12caff" stopOpacity="0" /></RadialGradient></Defs><Rect width="100%" height="100%" fill="url(#home-core)" /></Svg>
    </Animated.View>
    {[260, 475].map((position, index) => <Animated.View testID={`home-orbit-${index}`} key={position} style={{ position: 'absolute', left: centerX - chamberWidth / 2, top: y(position) - chamberWidth / 2, width: chamberWidth, height: chamberWidth, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.82] }), transform: [{ scaleY: 0.21 }, { rotate: orbit.interpolate({ inputRange: [0, 1], outputRange: index ? ['360deg', '0deg'] : ['0deg', '360deg'] }) }] }}>
      <Svg width="100%" height="100%" viewBox="0 0 300 300"><Circle cx="150" cy="150" r="142" fill="none" stroke="#97f9ff" strokeWidth="1" opacity="0.22" /><Circle cx="150" cy="150" r="142" fill="none" stroke={index ? '#f1b1ff' : '#a0ffff'} strokeWidth="3" strokeDasharray="125 40 12 40 65 80" /><Circle cx="150" cy="150" r="133" fill="none" stroke="#53daff" strokeWidth="1.2" strokeDasharray="6 24" /></Svg>
    </Animated.View>)}
    <View style={{ position: 'absolute', left: centerX - chamberWidth / 2, top: chamberTop, width: chamberWidth, height: chamberHeight, overflow: 'hidden' }}>
      <Animated.View testID="home-chamber-scan" style={{ width: '100%', height: 46 * scale, opacity: scan.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.72, 0.65, 0] }), transform: [{ translateY: scan.interpolate({ inputRange: [0, 1], outputRange: [-46 * scale, chamberHeight] }) }] }}>
        <Svg width="100%" height="100%"><Defs><LinearGradient id="home-scan" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#77ffff" stopOpacity="0" /><Stop offset="0.8" stopColor="#77ffff" stopOpacity="0.15" /><Stop offset="0.91" stopColor="#e1ffff" stopOpacity="0.95" /><Stop offset="1" stopColor="#77ffff" stopOpacity="0" /></LinearGradient></Defs><Rect width="100%" height="100%" fill="url(#home-scan)" /></Svg>
      </Animated.View>
    </View>
    {[0, 0.5].map(offset => {
      const phase = Animated.modulo(Animated.add(orbit, offset), 1);
      return <Animated.View testID={`home-floor-${offset}`} key={offset} style={{ position: 'absolute', left: centerX - chamberWidth * 0.52, top: floorY - chamberWidth * 0.085, width: chamberWidth * 1.04, height: chamberWidth * 0.17, opacity: phase.interpolate({ inputRange: [0, 0.16, 1], outputRange: [0, 0.65, 0] }), transform: [{ scale: phase.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.42] }) }] }}>
        <Svg width="100%" height="100%" viewBox="0 0 400 70"><Ellipse cx="200" cy="35" rx="192" ry="29" fill="none" stroke="#aaffff" strokeWidth="2" /><Ellipse cx="200" cy="35" rx="175" ry="25" fill="none" stroke="#66dfff" strokeWidth="1" opacity="0.4" /></Svg>
      </Animated.View>;
    })}
    {Array.from({ length: 18 }, (_, i) => {
      const phase = Animated.modulo(Animated.add(orbit, i / 18), 1);
      const startX = centerX + ((i * 73) % 400 - 200) * scale;
      return <Animated.View testID={`home-particle-${i}`} key={i} style={{ position: 'absolute', left: startX, top: floorY + (i % 3) * 20 * scale, width: (i % 4 === 0 ? 3 : 2) * scale, height: (i % 4 === 0 ? 23 : 4) * scale, borderRadius: 5, backgroundColor: i % 3 ? '#9fffff' : '#ffb0fc', opacity: phase.interpolate({ inputRange: [0, 0.12, 0.7, 1], outputRange: [0, 0.8, 0.65, 0] }), transform: [{ translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [30 * scale, -400 * scale] }) }, { translateX: phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, (i % 2 ? 24 : -24) * scale, 0] }) }] }} />;
    })}
  </View>;
}
const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  glow: { position: 'absolute' },
});
