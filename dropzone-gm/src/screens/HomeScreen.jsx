import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchSessions, connectWebSocket } from '../utils/api';

const statusColors = {
  lobby: '#2563eb',
  active: '#16a34a',
  ended: '#4b5563',
};

function SessionCard({ session, onPress }) {
  const date = session.createdAt
    ? new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{session.venueName || 'Unnamed Session'}</Text>
        <View style={[styles.badge, { backgroundColor: statusColors[session.status] || '#4b5563' }]}>
          <Text style={styles.badgeText}>{session.status}</Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <Text style={styles.metaText}>
          Code: <Text style={styles.joinCode}>{session.joinCode}</Text>
        </Text>
        <Text style={styles.metaText}>{date}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(() => {
    fetchSessions().then((data) => {
      setSessions(data);
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );

  useEffect(() => {
    const ws = connectWebSocket((msg) => {
      if (msg.type === 'session_created' || msg.type === 'session_update') {
        fetchSessions().then(setSessions);
      }
    });
    return () => ws.close();
  }, []);

  const handleSessionPress = (session) => {
    if (session.status === 'ended') {
      navigation.navigate('Results', { sessionId: session.id });
    } else {
      navigation.navigate('SessionManagement', { sessionId: session.id });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>DropZone</Text>
          <Text style={styles.subtitle}>Game Master Dashboard</Text>
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateSession')}
        >
          <Text style={styles.createBtnText}>+ New Session</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#9333ea" size="large" style={{ marginTop: 40 }} />
      ) : sessions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No sessions yet</Text>
          <Text style={styles.emptyHint}>Create your first session to get started</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SessionCard session={item} onPress={() => handleSessionPress(item)} />
          )}
          contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
        />
      )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  createBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  badge: {
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
  cardMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  joinCode: {
    fontFamily: 'monospace',
    color: '#facc15',
  },
  empty: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    fontSize: 18,
    color: '#6b7280',
  },
  emptyHint: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 8,
  },
});
