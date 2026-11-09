import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useGame } from '../context/GameContext';
import { clearSession } from '../utils/storage';

export default function ResultsScreen({ navigation }) {
  const { sessionData, players, playerId, clearGameState } = useGame();

  const leaderboard = sessionData?.leaderboard ||
    [...players].sort((a, b) => (b.kills || 0) - (a.kills || 0) || (b.damageDealt || 0) - (a.damageDealt || 0));

  const myStats = leaderboard.find(p => p.id === playerId);
  const myRank = leaderboard.findIndex(p => p.id === playerId) + 1;

  const handlePlayAgain = async () => {
    await clearSession();
    clearGameState();
    navigation.replace('MainMenu');
  };

  const renderRow = ({ item, index }) => {
    const isMe = item.id === playerId;
    const isWinner = index === 0;

    return (
      <View style={[styles.row, isMe && styles.rowMe, isWinner && styles.rowWinner]}>
        <Text style={[styles.rank, isWinner && styles.rankWinner]}>#{index + 1}</Text>
        <View style={styles.nameCol}>
          <Text style={[styles.name, isWinner && styles.nameWinner]}>
            {item.displayName} {isMe ? '(You)' : ''}
          </Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statValue}>{item.kills ?? 0}</Text>
          <Text style={styles.statLabel}>kills</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statValue}>{item.deaths ?? 0}</Text>
          <Text style={styles.statLabel}>deaths</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statValue}>{item.respawns ?? 0}</Text>
          <Text style={styles.statLabel}>respawns</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>GAME OVER</Text>

      {sessionData?.winnerName && (
        <Text style={styles.winner}>{sessionData.winnerName === 'Draw' ? 'Match drawn' : sessionData.winnerName + ' wins!'}</Text>
      )}

      {myStats && (
        <View style={styles.myStatsBox}>
          <Text style={styles.myStatsTitle}>YOUR RESULTS</Text>
          <View style={styles.myStatsRow}>
            <View style={styles.myStatItem}>
              <Text style={styles.myStatValue}>#{myRank}</Text>
              <Text style={styles.myStatLabel}>Place</Text>
            </View>
            <View style={styles.myStatItem}>
              <Text style={styles.myStatValue}>{myStats.kills ?? 0}</Text>
              <Text style={styles.myStatLabel}>Kills</Text>
            </View>
            <View style={styles.myStatItem}>
              <Text style={styles.myStatValue}>{myStats.deaths ?? 0}</Text>
              <Text style={styles.myStatLabel}>Deaths</Text>
            </View>
            <View style={styles.myStatItem}>
              <Text style={styles.myStatValue}>{myStats.respawns ?? 0}</Text>
              <Text style={styles.myStatLabel}>Respawns</Text>
            </View>
            <View style={styles.myStatItem}>
              <Text style={styles.myStatValue}>{myStats.damageDealt ?? 0}</Text>
              <Text style={styles.myStatLabel}>Damage</Text>
            </View>
          </View>
        </View>
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
    paddingTop: 30,
    paddingHorizontal: 16,
  },
  header: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 4,
  },
  winner: {
    color: '#ffd700',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 6,
  },
  myStatsBox: {
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  myStatsTitle: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
  },
  myStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  myStatItem: {
    alignItems: 'center',
  },
  myStatValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  myStatLabel: {
    color: '#888',
    fontSize: 10,
    marginTop: 2,
  },
  list: {
    paddingTop: 6,
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 8,
    borderRadius: 8,
    marginBottom: 5,
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
    width: 30,
  },
  rankWinner: {
    color: '#ffd700',
  },
  nameCol: {
    flex: 1,
  },
  name: {
    color: '#ccc',
    fontSize: 13,
  },
  nameWinner: {
    color: '#ffd700',
    fontWeight: 'bold',
  },
  statCol: {
    alignItems: 'center',
    marginHorizontal: 8,
    minWidth: 40,
  },
  statValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#666',
    fontSize: 9,
  },
  button: {
    backgroundColor: '#cc0000',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});
