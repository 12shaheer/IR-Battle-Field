import React, { useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, Animated } from 'react-native';
import { useGame } from '../context/GameContext';
import BattleTag from '../components/BattleTag';

export default function LobbyScreen({ navigation }) {
  const { sessionData, players, playerId } = useGame();
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    if (sessionData?.status === 'active') {
      navigation.replace('GameHUD');
    }
  }, [sessionData?.status]);

  const renderPlayer = ({ item }) => {
    const isMe = item.id === playerId;
    return (
      <View style={[styles.playerRow, isMe && styles.playerRowMe]}>
        <Text style={[styles.playerName, isMe && styles.playerNameMe]}>
          {item.displayName} {isMe ? '(You)' : ''}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
          <Text style={styles.waitingText}>Waiting for game to start...</Text>
        </View>

        <Text style={styles.joinCode}>
          Code: {sessionData?.joinCode || '------'}
        </Text>

        <Text style={styles.playerCount}>
          {players.length} / 40 players
        </Text>

        <BattleTag playerId={playerId} />
      </View>

      <FlatList
        data={players}
        keyExtractor={(item) => item.id}
        renderItem={renderPlayer}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00ff00',
    marginRight: 8,
  },
  waitingText: {
    color: '#aaa',
    fontSize: 16,
  },
  joinCode: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  playerCount: {
    color: '#888',
    fontSize: 14,
  },
  list: {
    padding: 16,
  },
  playerRow: {
    backgroundColor: '#1a1a2e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  playerRowMe: {
    backgroundColor: '#1a2e1a',
    borderWidth: 1,
    borderColor: '#00ff00',
  },
  playerName: {
    color: '#ccc',
    fontSize: 15,
  },
  playerNameMe: {
    color: '#00ff00',
    fontWeight: 'bold',
  },
});
