import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useSession } from '../hooks/useSession';
import { usePlayers } from '../hooks/usePlayers';
import { useEvents } from '../hooks/useEvents';
import { callFunction } from '../utils/api';
import LiveGrid from '../components-rn/LiveGrid';
import PlayerTable from '../components-rn/PlayerTable';
import EventLog from '../components-rn/EventLog';

function formatDuration(startedAt) {
  if (!startedAt) return '00:00';
  const start = new Date(startedAt);
  const diff = Math.floor((Date.now() - start.getTime()) / 1000);
  const mins = Math.floor(diff / 60);
  const secs = diff % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function ZoneTimer({ nextShrinkAt }) {
  const [timeLeft, setTimeLeft] = useState('--:--');

  useEffect(() => {
    const update = () => {
      if (!nextShrinkAt) { setTimeLeft('--:--'); return; }
      const target = new Date(nextShrinkAt);
      const diff = Math.max(0, target.getTime() - Date.now());
      const seconds = Math.floor(diff / 1000);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      setTimeLeft(seconds <= 0 ? 'SHRINKING' : `${mins}:${String(secs).padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [nextShrinkAt]);

  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>NEXT SHRINK</Text>
      <Text style={[styles.statValue, timeLeft === 'SHRINKING' && { color: '#f87171' }]}>
        {timeLeft}
      </Text>
    </View>
  );
}

export default function SessionManagementScreen({ route, navigation }) {
  const { sessionId } = route.params;
  const { session, loading } = useSession(sessionId);
  const players = usePlayers(sessionId);
  const events = useEvents(sessionId);

  const [elapsed, setElapsed] = useState('00:00');
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    if (!session?.startedAt || session.status !== 'active') return;
    const tick = () => setElapsed(formatDuration(session.startedAt));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session?.startedAt, session?.status]);

  useEffect(() => {
    if (session?.status === 'ended') {
      navigation.replace('Results', { sessionId });
    }
  }, [session?.status]);

  const handleStart = async () => {
    setStarting(true);
    try {
      await callFunction('startGame', { sessionId });
    } catch (e) {
      Alert.alert('Error', 'Failed to start: ' + (e.message || 'Unknown'));
    } finally {
      setStarting(false);
    }
  };

  const handleEnd = () => {
    Alert.alert('End Game', 'Are you sure you want to end this game?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Game',
        style: 'destructive',
        onPress: async () => {
          setEnding(true);
          try {
            await callFunction('endGameManually', { sessionId });
          } catch (e) {
            Alert.alert('Error', 'Failed to end: ' + (e.message || 'Unknown'));
          } finally {
            setEnding(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading session...</Text>
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

  const canStart = session.status === 'lobby' && (session.mode === 'team' ? Object.keys(session.teams || {}).length >= 2 : players.length >= 1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.venueName}>{session.venueName}</Text>
            <View style={[styles.badge, { backgroundColor: session.status === 'lobby' ? '#2563eb' : session.status === 'active' ? '#16a34a' : '#4b5563' }]}>
              <Text style={styles.badgeText}>{session.status}</Text>
            </View>
          </View>
        </View>

        {/* Join Code */}
        <View style={styles.joinCodeBox}>
          <Text style={styles.joinCodeLabel}>JOIN CODE</Text>
          <Text style={styles.joinCode}>{session.joinCode}</Text>
        </View>

        {/* Stats row */}
        {session.status === 'active' && (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>ELAPSED</Text>
              <Text style={styles.statValue}>{elapsed}</Text>
            </View>
            {session.mode !== 'team' && <ZoneTimer nextShrinkAt={session.nextShrinkAt} />}
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>ALIVE</Text>
              <Text style={styles.statValue}>
                {players.filter((p) => p.status === 'alive').length}/{players.length}
              </Text>
            </View>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          {session.status === 'lobby' && (
            <TouchableOpacity
              style={[styles.startBtn, (!canStart || starting) && styles.btnDisabled]}
              onPress={handleStart}
              disabled={!canStart || starting}
            >
              <Text style={styles.actionBtnText}>
                {starting ? 'Starting...' : `START GAME (${players.length} players)`}
              </Text>
            </TouchableOpacity>
          )}
          {session.status === 'active' && (
            <TouchableOpacity
              style={[styles.endBtn, ending && styles.btnDisabled]}
              onPress={handleEnd}
              disabled={ending}
            >
              <Text style={styles.actionBtnText}>{ending ? 'Ending...' : 'END GAME'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {session.mode === 'team' && <><Text style={styles.sectionTitle}>TEAM SCORES</Text>{Object.values(session.teams || {}).sort((a, b) => b.score - a.score).map(team => <View key={team.id} style={styles.statBox}><Text style={styles.statLabel}>{team.name} · {team.playerIds.length} players</Text><Text style={styles.statValue}>{team.score} kills</Text></View>)}</>}
      {/* Live Grid */}
      <Text style={styles.sectionTitle}>LIVE GRID</Text>
      <LiveGrid
        players={players}
        zoneCenter={session.zoneCenter}
        zoneRadius={session.zoneRadius}
        gridSize={100}
      />

      {/* Event Log */}
      <Text style={styles.sectionTitle}>EVENT LOG</Text>
      <EventLog events={events} />

      {/* Player Table */}
      <Text style={styles.sectionTitle}>PLAYERS ({players.length})</Text>
      <PlayerTable players={players} sessionId={sessionId} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  content: {
    padding: 16,
    paddingTop: 56,
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
  headerCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  venueName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  joinCodeBox: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  joinCodeLabel: {
    fontSize: 10,
    color: '#9ca3af',
    letterSpacing: 1,
    marginBottom: 4,
  },
  joinCode: {
    fontSize: 32,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#facc15',
    letterSpacing: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#9ca3af',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#fb923c',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  startBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  endBtn: {
    flex: 1,
    backgroundColor: '#b91c1c',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
});
