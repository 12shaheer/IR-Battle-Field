import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSession } from '../hooks/useSession';
import { usePlayers } from '../hooks/usePlayers';
import { useEvents } from '../hooks/useEvents';

function formatDuration(startedAt) {
  if (!startedAt) return '--:--';
  const start = new Date(startedAt);
  const diff = Math.floor((Date.now() - start.getTime()) / 1000);
  const mins = Math.floor(diff / 60);
  const secs = diff % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function ResultsScreen({ route, navigation }) {
  const { sessionId } = route.params;
  const { session, loading } = useSession(sessionId);
  const players = usePlayers(sessionId);
  const events = useEvents(sessionId);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Session not found</Text>
      </View>
    );
  }

  const leaderboard = session.leaderboard?.length
    ? session.leaderboard
    : [...players].sort((a, b) => {
        if (a.status === 'alive' && b.status !== 'alive') return -1;
        if (b.status === 'alive' && a.status !== 'alive') return 1;
        return (b.kills || 0) - (a.kills || 0) || (b.damageDealt || 0) - (a.damageDealt || 0);
      });

  const totalKills = events.filter((e) => e.type === 'kill').length;
  const zoneShrinks = events.filter((e) => e.type === 'zone_shrink').length;
  const duration = session.startedAt ? formatDuration(session.startedAt) : '--:--';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.gameOver}>GAME OVER</Text>
      {session.winnerName && (
        <Text style={styles.winner}>{session.winnerName === 'Draw' ? 'DRAW' : session.winnerName + ' wins!'}</Text>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{players.length}</Text>
          <Text style={styles.statLabel}>Players</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{duration}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#f87171' }]}>{totalKills}</Text>
          <Text style={styles.statLabel}>Kills</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#fb923c' }]}>{zoneShrinks}</Text>
          <Text style={styles.statLabel}>Shrinks</Text>
        </View>
      </View>

      {session.mode === 'team' && session.teamLeaderboard?.map(team => <View key={team.id} style={styles.statCard}><Text style={styles.statLabel}>{team.name}</Text><Text style={styles.statNumber}>{team.score} kills</Text></View>)}
      {/* Leaderboard */}
      <View style={styles.leaderboard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, { flex: 0.4 }]}>#</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Name</Text>
          <Text style={styles.tableCell}>Kills</Text>
          <Text style={styles.tableCell}>Dmg</Text>
          <Text style={styles.tableCell}>Status</Text>
        </View>
        {leaderboard.map((player, i) => (
          <View key={player.id || player.playerId || i} style={styles.tableRow}>
            <Text style={[styles.rowCell, { flex: 0.4, color: '#9ca3af' }]}>{i + 1}</Text>
            <Text style={[styles.rowCell, { flex: 2, color: '#fff', fontWeight: '500' }]}>
              {i === 0 ? '\u{1F451} ' : ''}{player.displayName}
            </Text>
            <Text style={[styles.rowCell, { color: '#fca5a5' }]}>{player.kills ?? 0}</Text>
            <Text style={[styles.rowCell, { color: '#d1d5db' }]}>{player.damageDealt ?? 0}</Text>
            <View style={[styles.statusBadge, { backgroundColor: player.status === 'alive' ? '#16a34a' : '#dc2626' }]}>
              <Text style={styles.statusText}>{player.status}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
      >
        <Text style={styles.backBtnText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a1a',
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  errorText: {
    color: '#f87171',
    fontSize: 16,
  },
  gameOver: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  winner: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#facc15',
    textAlign: 'center',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 10,
    color: '#9ca3af',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  leaderboard: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    backgroundColor: '#111827',
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  rowCell: {
    flex: 1,
    fontSize: 14,
  },
  statusBadge: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  backBtn: {
    backgroundColor: '#374151',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
