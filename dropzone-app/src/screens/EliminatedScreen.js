import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGame } from '../context/GameContext';
import { teardownIRHardware } from '../game/irSetup';
import MiniMap from '../components/MiniMap';

export default function EliminatedScreen({ navigation }) {
  const { sessionData, playerData, players } = useGame();
  const [secondsLeft, setSecondsLeft] = useState(60);
  const timerRef = useRef(null);

  useEffect(() => {
    if (sessionData?.status === 'ended') {
      teardownIRHardware();
      navigation.replace('Results');
    }
  }, [sessionData?.status]);

  useEffect(() => {
    if (playerData?.status === 'alive' && playerData?.health > 0) {
      navigation.replace('GameHUD');
    }
  }, [playerData?.status, playerData?.health]);

  useEffect(() => {
    const respawnAt = playerData?.respawnAt;
    if (!respawnAt) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((respawnAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [playerData?.respawnAt]);

  const eliminatedBy = playerData?.eliminatedBy;
  const killer = eliminatedBy && eliminatedBy !== 'zone'
    ? players.find(p => p.id === eliminatedBy)
    : null;

  const eliminatedByText = killer
    ? `Eliminated by ${killer.displayName}`
    : 'Eliminated by the zone';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>YOU HAVE BEEN</Text>
        <Text style={styles.eliminated}>ELIMINATED</Text>
        <Text style={styles.killedBy}>{eliminatedByText}</Text>
      </View>

      <View style={styles.respawnBox}>
        <Text style={styles.respawnLabel}>RESPAWNING IN</Text>
        <Text style={styles.respawnTimer}>{secondsLeft}s</Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Kills</Text>
          <Text style={styles.statValue}>{playerData?.kills ?? 0}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Damage Dealt</Text>
          <Text style={styles.statValue}>{playerData?.damageDealt ?? 0}</Text>
        </View>
      </View>

      <Text style={styles.spectatorLabel}>Spectating...</Text>
      <MiniMap
        playerPosition={null}
        zoneCenter={sessionData?.zoneCenter}
        zoneRadius={sessionData?.zoneRadius}
        style={styles.map}
      />

      <Text style={styles.aliveCount}>
        {players.filter(p => p.status === 'alive').length} remaining
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#666',
    fontSize: 16,
    letterSpacing: 3,
  },
  eliminated: {
    color: '#ff0000',
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginVertical: 4,
  },
  killedBy: {
    color: '#aaa',
    fontSize: 16,
    marginTop: 8,
  },
  respawnBox: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  respawnLabel: {
    color: '#00e5ff',
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 4,
  },
  respawnTimer: {
    color: '#00e5ff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#222',
  },
  statRow: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  spectatorLabel: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  map: {
    flex: 1,
    marginBottom: 12,
    opacity: 0.6,
  },
  aliveCount: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    paddingBottom: 30,
  },
});
