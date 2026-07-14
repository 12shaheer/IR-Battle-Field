import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Image } from 'react-native';
import Svg, { Rect, Line, Defs, LinearGradient, Stop } from 'react-native-svg';

const CHARACTER_IMAGES = {
  homer: require('../../assets/Homer Simpson.jpeg'),
  peter: require('../../assets/Peter Griffin.jpeg'),
  gojo: require('../../assets/Satoru Gojo.webp'),
  inosuke: require('../../assets/Inosuke Hashibira.jpeg'),
};

export default function HealthBar({ health, maxHealth = 100, characterId }) {
  const flashAnim = useRef(new Animated.Value(0)).current;
  const prevHealth = useRef(health);

  useEffect(() => {
    if (health < prevHealth.current) {
      Animated.sequence([
        Animated.timing(flashAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: false,
        }),
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
    prevHealth.current = health;
  }, [health]);

  const healthPct = Math.max(0, (health / maxHealth) * 100);
  const segments = 20;
  const filledSegments = Math.ceil((healthPct / 100) * segments);

  const backgroundColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', 'rgba(255,0,0,0.3)'],
  });

  const avatarSource = characterId ? CHARACTER_IMAGES[characterId] : null;

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      <View style={styles.avatarWrapper}>
        {/* glow lines + blurred gradient sitting above the avatar frame */}
        <View style={styles.glowOverlay} pointerEvents="none">
          <Svg width={58} height={26} viewBox="0 0 58 26">
            <Defs>
              <LinearGradient id="beamGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#ffd27a" stopOpacity="1" />
                <Stop offset="50%" stopColor="#ffd27a" stopOpacity="0.05" />
                <Stop offset="100%" stopColor="#ffd27a" stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect x="1" y="2" width="56" height="24" fill="url(#beamGlow)" opacity="0.2" />
            <Line x1="1" y1="26" x2="1" y2="2" stroke="#ffd27a" strokeWidth="2" />
            <Line x1="57" y1="26" x2="57" y2="2" stroke="#ffd27a" strokeWidth="2" />
          </Svg>
        </View>

        <View style={styles.avatarFrame}>
          {avatarSource ? (
            <Image source={avatarSource} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarIcon}>👤</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.barsContainer}>
        <View style={styles.hpRow}>
          <Text style={styles.hpText}>{health}</Text>
          <Text style={styles.hpMax}>/{maxHealth}</Text>
        </View>

        <View style={styles.segmentedBar}>
          {Array.from({ length: segments }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.segment,
                {
                  backgroundColor:
                    i < filledSegments
                      ? healthPct > 50
                        ? '#00e5ff'
                        : healthPct > 25
                          ? '#ffaa00'
                          : '#ff0000'
                      : 'rgba(255,255,255,0.1)',
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.playerNameTag}>
          <Text style={styles.playerName}>PLAYER</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#3a3a3a',
    // tilt the whole card, matching the reference HUD's skewed panel look
    transform: [
      { perspective: 900 },
      { rotateX: '4deg' },
      { rotateY: '10deg' },
      { rotate: '-1deg' },
    ],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  avatarWrapper: {
    marginRight: 10,
  },

  glowOverlay: {
    position: 'absolute',
    top: -24,
    left: 0,
    width: 58,
    height: 26,
    zIndex: 1,
  },

  avatarFrame: {
    width: 58,
    height: 58,
    borderWidth: 2,
    borderColor: '#29c9e8',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#5a5a5a',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  avatarPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,150,200,0.2)',
  },

  avatarIcon: {
    fontSize: 26,
  },

  barsContainer: {
    justifyContent: 'center',
  },

  hpRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },

  hpText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  hpMax: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginLeft: 2,
  },

  segmentedBar: {
    flexDirection: 'row',
    height: 14,
    gap: 2,
    marginBottom: 6,
  },

  segment: {
    width: 8,
    height: '100%',
    borderRadius: 1,
  },

  playerNameTag: {
    backgroundColor: '#2b2b2b',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },

  playerName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    letterSpacing: 1,
  },
});