import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useGame } from '../context/GameContext';
import { clearSession } from '../utils/storage';

export default function ResultsScreen({ navigation }) {
  const { sessionData, players, playerId, clearGameState } = useGame();

  const leaderboard = sessionData?.leaderboard ||
    [...players].sort((a, b) => {
      if (a.status === 'alive' && b.status !== 'alive') return -1;
      if (b.status === 'alive' && a.status !== 'alive') return 1;
      return b.kills - a.kills || b.damageDealt - a.damageDealt;
    });

  const handlePlayAgain = async () => {
    await clearSession();
    clearGameState();
    navigation.replace('Join');
  };

  const renderRow = ({ item, index }) => {
    const isMe = item.id === playerId;
    const isWinner = item.id === sessionData?.winnerId || index === 0;

    return (
      <View style={[
        styles.row,
        isMe && styles.rowMe,
        isWinner && styles.rowWinner,
      ]}>
        <Text style={styles.rank}>#{index + 1}</Text>
        <View style={styles.nameCol}>
          <Text style={[styles.name, isWinner && styles.nameWinner]}>
            {item.displayName} {isMe ? '(You)' : ''}
          </Text>
        </View>
        <Text style={styles.kills}>{item.kills ?? 0} kills</Text>
        <Text style={styles.damage}>{item.damageDealt ?? 0} dmg</Text>
        <Text style={[
          styles.status,
          item.status === 'alive' ? styles.alive : styles.dead,
        ]}>
          {item.status === 'alive' ? '🏆' : '💀'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>GAME OVER</Text>

      {sessionData?.winnerName && (
        <Text style={styles.winner}>👑 {sessionData.winnerName} wins!</Text>
      )}

      <FlatList
        data={leaderboard}
        keyExtractor={(item, index) => item.id || String(index)}
        renderItem={renderRow}
        contentContainerStyle={styles.list}
      />

      <TouchableOpacity style={styles.button} onPress={handlePlayAgain} activeOpacity={0.7}>
        <Text style={styles.buttonText}>PLAY AGAIN</Text>
      </TouchableOpacity>
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
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 4,
  },
  winner: {
    color: '#ffd700',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 12,
  },
  list: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  rowMe: {
    borderWidth: 1,
    borderColor: '#3399ff',
    backgroundColor: '#1a1a3e',
  },
  rowWinner: {
    borderWidth: 1,
    borderColor: '#ffd700',
    backgroundColor: '#2e2a1a',
  },
  rank: {
    color: '#888',
    fontSize: 14,
    fontWeight: 'bold',
    width: 32,
  },
  nameCol: {
    flex: 1,
  },
  name: {
    color: '#ccc',
    fontSize: 14,
  },
  nameWinner: {
    color: '#ffd700',
    fontWeight: 'bold',
  },
  kills: {
    color: '#ff6666',
    fontSize: 12,
    marginRight: 10,
  },
  damage: {
    color: '#aaa',
    fontSize: 12,
    marginRight: 8,
  },
  status: {
    fontSize: 14,
  },
  alive: {
    color: '#00ff00',
  },
  dead: {
    color: '#666',
  },
  button: {
    backgroundColor: '#cc0000',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 40,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});
