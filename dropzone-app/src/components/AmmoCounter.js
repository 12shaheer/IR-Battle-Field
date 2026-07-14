import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export default function AmmoCounter({ ammo, maxAmmo }) {
  const isInfinite = maxAmmo === '∞';
  const ammoPct = isInfinite ? 100 : (maxAmmo > 0 ? (ammo / maxAmmo) * 100 : 0);
  const totalBars = 8;
  const filledBars = isInfinite ? totalBars : Math.round((ammoPct / 100) * totalBars);

  return (
    <View style={styles.wrapper}>
      <View style={styles.panel}>
        {/* Ammo text */}
        <View style={styles.ammoTextRow}>
          <Text style={styles.ammoCount}>{ammo}</Text>
          <Text style={styles.ammoDivider}>/</Text>
          <Text style={styles.ammoMax}>{maxAmmo}</Text>
        </View>

        {/* Bar + gun row */}
        <View style={styles.bottomRow}>
          {/* Segmented ammo bar */}
          <View style={styles.barContainer}>
            {Array.from({ length: totalBars }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.barSegment,
                  { opacity: i < filledBars ? 1 : 0.25 },
                ]}
              />
            ))}
          </View>

          {/* Gun image (placeholder - replace uri with real asset) */}
          <Image
            source={require('../../assets/Gun_Icon.png')}
            style={styles.gunImage}
            resizeMode="contain"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'flex-end',
  },
  panel: {
    backgroundColor: 'rgba(30,33,38,0.9)',
    borderRadius: 0,
    paddingVertical: 8,
    paddingHorizontal: 10,
    transform: [
      { perspective: 800 },
      { rotateX: '4deg' },
      { rotateY: '-10deg' },
      { rotate: '1deg' },
    ],
  },
  ammoTextRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  ammoCount: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '500',
  },
  ammoDivider: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 18,
    fontWeight: '500',
    marginHorizontal: 1,
  },
  ammoMax: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 22,
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barContainer: {
    flexDirection: 'row',
  },
  barSegment: {
    width: 6,
    height: 20,
    marginRight: 3,
    backgroundColor: '#3fc4e8',
    transform: [{ skewX: '-20deg' }],
  },
  gunImage: {
    width: 100,
    height: 40,
    marginLeft: 8,
  },
});