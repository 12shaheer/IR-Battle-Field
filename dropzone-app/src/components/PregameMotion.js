import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false;subscription.remove(); };
  }, []);
  return reduced;
}
export function useAmbientPhase(duration = 6500) {
  const phase = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  useFocusEffect(useCallback(() => {
    phase.setValue(0);
    if (reduced) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(phase, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web', isInteraction: false }),
      Animated.timing(phase, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web', isInteraction: false }),
    ]), { iterations: -1, resetBeforeIteration: true });
    animation.start();return () => animation.stop();
  }, [phase, duration, reduced]));
  return phase;
}
export function MotionEntrance({ children, delay = 0, style, direction = 1 }) {
  const phase = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  useFocusEffect(useCallback(() => {
    phase.setValue(reduced ? 1 : 0);
    if (reduced) return;
    const animation = Animated.timing(phase, { toValue: 1, delay, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' });
    animation.start();return () => animation.stop();
  }, [phase, delay, reduced]));
  return <Animated.View style={[style, { opacity: phase, transform: [{ translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [24 * direction, 0] }) }] }]}>{children}</Animated.View>;
}
export function CinematicBackdrop({ source, hero = false }) {
  const phase = useAmbientPhase(hero ? 4400 : 10000);
  return <Animated.Image source={source} resizeMode="cover" style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%', transform: [{ scale: hero ? 1.055 : 1.045 }, { translateX: phase.interpolate({ inputRange: [0, 1], outputRange: hero ? [0, 0] : [-5, 5] }) }, { translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [0, 0] }) }] }]} />;
}
export function AmbientEffects({ home = false }) {
  const phase = useAmbientPhase();
  const { height } = useWindowDimensions();
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    {[12, 27, 46, 68, 83, 94].map((left, i) => <Animated.View key={left} style={{ position: 'absolute', left: `${left}%`, top: `${18 + (i * 13) % 65}%`, width: i % 2 ? 2 : 4, height: i % 2 ? 48 : 4, borderRadius: 4, backgroundColor: i % 2 ? '#b0faff' : '#e3ff50', opacity: phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.06, 0.36, 0.1] }), transform: [{ translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [18 + i * 2, -28 - i * 4] }) }, { rotate: '-20deg' }] }} />)}
    {home && <View style={styles.chamber}><Animated.View style={[styles.scan, { transform: [{ translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [height * 0.08, height * 0.51] }) }], opacity: phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.04, 0.3, 0.04] }) }]} /></View>}
  </View>;
}
const styles = StyleSheet.create({
  chamber: { position: 'absolute', left: '36%', width: '29%', top: '16%', bottom: '15%', overflow: 'hidden' },
  scan: { height: 2, backgroundColor: '#c4ffff', shadowColor: '#70f8ff', shadowOpacity: 1, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } },
});
