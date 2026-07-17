import { View, Text, ScrollView, StyleSheet } from 'react-native';

const typeColors = {
  kill: '#f87171',
  zone_kill: '#fb923c',
  zone_damage: '#fdba74',
  zone_shrink: '#fb923c',
  hit: '#fde047',
  game_started: '#60a5fa',
  game_ended: '#60a5fa',
  player_revived: '#4ade80',
};

function describeEvent(event) {
  switch (event.type) {
    case 'kill':
      return `${event.actorName} eliminated ${event.targetName}`;
    case 'hit':
      return `${event.actorName} hit ${event.targetName} (-${event.damage})`;
    case 'zone_kill':
      return `Zone eliminated ${event.targetName}`;
    case 'zone_damage':
      return `Zone damaged ${event.targetName} (-${event.damage || '?'})`;
    case 'zone_shrink':
      return `Zone shrunk to radius ${Math.round(event.newRadius)}`;
    case 'game_started':
      return `Game started with ${event.playerCount} players`;
    case 'game_ended':
      return event.winnerName ? `Game over — ${event.winnerName} wins!` : 'Game over';
    case 'player_revived':
      return `${event.targetName} was revived`;
    default:
      return event.type;
  }
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function EventLog({ events }) {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} nestedScrollEnabled>
        {events.length === 0 ? (
          <Text style={styles.emptyText}>No events yet</Text>
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <Text style={styles.timestamp}>{formatTime(event.timestamp)}</Text>
              <Text style={[styles.eventText, { color: typeColors[event.type] || '#d1d5db' }]}>
                {describeEvent(event)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    height: 200,
    marginBottom: 16,
  },
  scroll: {
    padding: 12,
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 20,
  },
  eventRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  timestamp: {
    fontSize: 11,
    color: '#6b7280',
  },
  eventText: {
    fontSize: 12,
    flex: 1,
  },
});
