import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { callFunction } from '../utils/firebase';
import { fireShot } from '../game/combat';
import { getTargetInSight } from '../game/targeting';
import { playSound } from '../utils/sounds';
import { useGame } from '../context/GameContext';

const RING_SIZE = 96;
const RING_RADIUS = 44;
const TICK_COUNT = 40;
const CYAN = '#3ee0e8';
const CYAN_BRIGHT = '#5ef2f9';
const CYAN_DIM = '#1c2a30';
const BG = '#11151a';

const AnimatedLine = Animated.createAnimatedComponent(Line);

function EnergyRing() {
  const opacities = useRef(
    Array.from({ length: TICK_COUNT }, () => new Animated.Value(0.2))
  ).current;

  useEffect(() => {
    const animations = opacities.map((val, i) => {
      const half = (1200 + (i % 5) * 150) / 2;
      const delay = (i % 12) * 80;
      return Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration: half, delay, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.2, duration: half, useNativeDriver: true }),
        ])
      );
    });
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  const center = RING_SIZE / 2;

  return (
    <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
      <Circle cx={center} cy={center} r={RING_RADIUS} stroke={CYAN_DIM} strokeWidth={1.5} fill="none" />
      {opacities.map((val, i) => {
        const angle = (2 * Math.PI * i) / TICK_COUNT;
        const x1 = center + RING_RADIUS * Math.cos(angle);
        const y1 = center + RING_RADIUS * Math.sin(angle);
        const x2 = center + (RING_RADIUS + 6) * Math.cos(angle);
        const y2 = center + (RING_RADIUS + 6) * Math.sin(angle);
        return (
          <AnimatedLine
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={CYAN_BRIGHT}
            strokeWidth={1.5}
            strokeLinecap="round"
            opacity={val}
          />
        );
      })}
    </Svg>
  );
}

const DIAMOND_OFFSETS = [
  { top: -6, left: RING_SIZE / 2 - 6 },
  { top: RING_SIZE / 2 - 6, left: RING_SIZE - 6 },
  { top: RING_SIZE - 6, left: RING_SIZE / 2 - 6 },
  { top: RING_SIZE / 2 - 6, left: -6 },
];

function DiamondMarkers() {
  return DIAMOND_OFFSETS.map((pos, i) => (
    <View key={i} style={[styles.diamond, { top: pos.top, left: pos.left }]} />
  ));
}

export default function ShootButton() {
  const { sessionId, playerId, playerData, players } = useGame();

  const ammo = playerData?.ammo ?? 0;
  const maxAmmo = '∞';
  const needsReload = ammo <= 0;

  const handleShoot = () => {
    if (needsReload) return;

    playSound('gunshot');

    // Drop this shot in the mailbox with whoever the camera has in its sights
    // (null = a miss). Later the IR blaster hands its own target to the same
    // mailbox, and none of the game logic changes.
    fireShot({
      sessionId,
      shooterId: playerId,
      players,
      targetId: getTargetInSight(),
    });
  };

  const handleReload = () => {
    callFunction('reloadAmmo', { sessionId, playerId });
  };

  if (needsReload) {
    return (
      <TouchableOpacity
        style={styles.button}
        onPress={handleReload}
        activeOpacity={0.7}
      >
        <EnergyRing />
        <DiamondMarkers />
        <Text style={styles.buttonText}>RELOAD</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleShoot}
      activeOpacity={0.7}
    >
      <EnergyRing />
      <DiamondMarkers />
      <View style={styles.inner}>
        <Text style={styles.buttonText}>SHOOT</Text>
        <Text style={styles.ammoText}>{ammo}/{maxAmmo}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  diamond: {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: CYAN,
    transform: [{ rotate: '45deg' }],
  },
  inner: {
    alignItems: 'center',
  },
  buttonText: {
    color: CYAN_BRIGHT,
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1,
  },
  ammoText: {
    color: CYAN,
    fontSize: 10,
    marginTop: 2,
  },
});