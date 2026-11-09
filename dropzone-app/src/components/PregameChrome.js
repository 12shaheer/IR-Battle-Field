import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Pattern, Path } from 'react-native-svg';

export const LIME = '#deff00';
export function PurpleBackdrop() {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Svg width="100%" height="100%">
      <Defs>
        <LinearGradient id="pregame-purple" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#6b00d5" /><Stop offset="0.55" stopColor="#4b00b1" /><Stop offset="1" stopColor="#24005f" />
        </LinearGradient>
        <Pattern id="pregame-pattern" width="48" height="48" patternUnits="userSpaceOnUse">
          <Rect x="4" y="4" width="15" height="15" rx="2" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.045" />
          <Path d="M30 32l8 8m0-8l-8 8" stroke="#ffffff" opacity="0.04" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#pregame-purple)" />
      <Rect width="100%" height="100%" fill="url(#pregame-pattern)" />
    </Svg>
    <View style={styles.frame} />
  </View>;
}
export function BackButton({ onPress, label = 'BACK' }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.back, pressed && { opacity: 0.65 }]}>
    <Text style={styles.backArrow}>‹</Text><Text style={styles.backLabel}>{label}</Text>
  </Pressable>;
}
export function LockIcon({ size = 28, color = '#fff' }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" /><Path d="M12 14v3" stroke={color} strokeWidth="2" /></Svg>;
}
const styles = StyleSheet.create({
  frame: { ...StyleSheet.absoluteFillObject, borderWidth: 4, borderColor: 'rgba(255,255,255,0.8)', borderTopLeftRadius: 12, borderBottomRightRadius: 42, margin: 8 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingRight: 18 },
  backArrow: { color: '#fff', fontSize: 30, lineHeight: 32 },
  backLabel: { color: '#fff', fontWeight: '800', fontSize: 11, letterSpacing: 2 },
});
