import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DemoMap({ playerPosition }) {
  const playerX = playerPosition?.x ?? 50;
  const playerY = playerPosition?.y ?? 50;

  return (
    <View style={styles.container}>
      {/* Map label */}
      <View style={styles.labelRow}>
        <Text style={styles.mapIcon}>🗺️</Text>
        <Text style={styles.mapLabel}>MAP</Text>
      </View>

      {/* Map area */}
      <View style={styles.mapArea}>
        {/* Grid lines */}
        {[25, 50, 75].map((pct) => (
          <View key={`v${pct}`} style={[styles.gridLineV, { left: `${pct}%` }]} />
        ))}
        {[25, 50, 75].map((pct) => (
          <View key={`h${pct}`} style={[styles.gridLineH, { top: `${pct}%` }]} />
        ))}

        {/* Zone circle */}
        <View style={styles.zoneCircle} />

        {/* Buildings / landmarks */}
        <View style={[styles.building, { top: '15%', left: '20%', width: 12, height: 8 }]} />
        <View style={[styles.building, { top: '35%', left: '60%', width: 10, height: 10 }]} />
        <View style={[styles.building, { top: '70%', left: '30%', width: 14, height: 6 }]} />
        <View style={[styles.building, { top: '55%', left: '75%', width: 8, height: 12 }]} />
        <View style={[styles.building, { top: '20%', left: '80%', width: 10, height: 6 }]} />

        {/* Player dot */}
        <View
          style={[
            styles.playerDot,
            { left: `${playerX}%`, top: `${playerY}%` },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 100,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mapIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  mapLabel: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    opacity: 0.8,
  },
  mapArea: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 15, 30, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    overflow: 'hidden',
    position: 'relative',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  zoneCircle: {
    position: 'absolute',
    width: '70%',
    height: '70%',
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 60, 60, 0.6)',
    backgroundColor: 'rgba(255, 0, 0, 0.03)',
    top: '15%',
    left: '15%',
  },
  building: {
    position: 'absolute',
    backgroundColor: 'rgba(100, 120, 150, 0.4)',
    borderWidth: 0.5,
    borderColor: 'rgba(150, 170, 200, 0.3)',
    borderRadius: 1,
  },
  playerDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00e5ff',
    borderWidth: 1.5,
    borderColor: '#fff',
    marginLeft: -4,
    marginTop: -4,
  },
});
