import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { callFunction } from '../utils/api';

function HealthBar({ health }) {
  const pct = Math.max(0, Math.min(100, health));
  const color = pct > 50 ? '#22c55e' : pct > 25 ? '#eab308' : '#ef4444';

  return (
    <View style={styles.healthBarOuter}>
      <View style={[styles.healthBarInner, { width: `${pct}%`, backgroundColor: color }]} />
      <Text style={styles.healthText}>{health}</Text>
    </View>
  );
}

export default function PlayerTable({ players, sessionId }) {
  const [reviving, setReviving] = useState(null);

  const sorted = [...players].sort((a, b) => {
    if (a.status === 'alive' && b.status !== 'alive') return -1;
    if (b.status === 'alive' && a.status !== 'alive') return 1;
    return (b.kills || 0) - (a.kills || 0);
  });

  const handleRevive = async (playerId) => {
    setReviving(playerId);
    try {
      await callFunction('revivePlayer', { sessionId, playerId });
    } catch (e) {
      Alert.alert('Error', 'Revive failed: ' + (e.message || 'Unknown'));
    } finally {
      setReviving(null);
    }
  };

  if (players.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No players yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, { flex: 2 }]}>Player</Text>
        <Text style={[styles.headerCell, { flex: 1.5 }]}>HP</Text>
        <Text style={styles.headerCell}>Kills</Text>
        <Text style={styles.headerCell}>Dmg</Text>
        <Text style={[styles.headerCell, { flex: 1.2 }]}>Action</Text>
      </View>

      {sorted.map((player) => (
        <View key={player.id} style={styles.row}>
          <View style={{ flex: 2 }}>
            <Text style={styles.playerName}>{player.displayName}</Text>
            <View style={[styles.statusDot, { backgroundColor: player.status === 'alive' ? '#22c55e' : '#dc2626' }]} />
          </View>
          <View style={{ flex: 1.5 }}>
            <HealthBar health={player.health ?? 0} />
          </View>
          <Text style={[styles.cell, { flex: 1 }]}>{player.kills ?? 0}</Text>
          <Text style={[styles.cell, { flex: 1 }]}>{player.damageDealt ?? 0}</Text>
          <View style={{ flex: 1.2, alignItems: 'flex-start' }}>
            {player.status === 'eliminated' && (
              <TouchableOpacity
                style={[styles.reviveBtn, reviving === player.id && { opacity: 0.5 }]}
                onPress={() => handleRevive(player.id)}
                disabled={reviving === player.id}
              >
                <Text style={styles.reviveBtnText}>
                  {reviving === player.id ? '...' : 'Revive'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  emptyContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    backgroundColor: '#111827',
  },
  headerCell: {
    flex: 1,
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  playerName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 3,
  },
  cell: {
    fontSize: 13,
    color: '#d1d5db',
  },
  healthBarOuter: {
    height: 14,
    backgroundColor: '#374151',
    borderRadius: 7,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthBarInner: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 7,
  },
  healthText: {
    fontSize: 9,
    color: '#fff',
    marginLeft: 4,
    fontWeight: 'bold',
    zIndex: 1,
  },
  reviveBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  reviveBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
