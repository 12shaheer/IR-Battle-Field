import React from 'react';
import { View, StyleSheet } from 'react-native';

const GRID_SIZE = 100;

function clamp(value, min, max) {
  if (value == null || isNaN(value)) return 50;
  return Math.max(min, Math.min(max, value));
}

export default function MiniMap({ playerPosition, zoneCenter, zoneRadius, style }) {
  const centerX = clamp(zoneCenter?.x, 0, GRID_SIZE);
  const centerY = clamp(zoneCenter?.y, 0, GRID_SIZE);
  const radiusPct = zoneRadius ? (zoneRadius / GRID_SIZE) * 100 : 40;
  const zoneDiameterPct = radiusPct * 2;

  const playerX = clamp(playerPosition?.x, 0, GRID_SIZE);
  const playerY = clamp(playerPosition?.y, 0, GRID_SIZE);

  return (
    <View style={[styles.container, style]}>
      {/* Zone circle */}
      <View
        style={[
          styles.zone,
          {
            width: `${zoneDiameterPct}%`,
            height: `${zoneDiameterPct}%`,
            left: `${(centerX / GRID_SIZE) * 100 - zoneDiameterPct / 2}%`,
            top: `${(centerY / GRID_SIZE) * 100 - zoneDiameterPct / 2}%`,
          },
        ]}
      />

      {/* Player dot */}
      {playerPosition && (
        <View
          style={[
            styles.playerDot,
            {
              left: `${(playerX / GRID_SIZE) * 100}%`,
              top: `${(playerY / GRID_SIZE) * 100}%`,
            },
          ]}
        />
      )}

      {/* Grid lines */}
      {[20, 40, 60, 80].map((pct) => (
        <View key={`v${pct}`} style={[styles.gridLineV, { left: `${pct}%` }]} />
      ))}
      {[20, 40, 60, 80].map((pct) => (
        <View key={`h${pct}`} style={[styles.gridLineH, { top: `${pct}%` }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#0f0f1f',
    position: 'relative',
  },
  zone: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: 'rgba(255, 60, 60, 0.7)',
    backgroundColor: 'rgba(255, 0, 0, 0.05)',
  },
  playerDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
    borderWidth: 2,
    borderColor: '#fff',
    marginLeft: -6,
    marginTop: -6,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});
