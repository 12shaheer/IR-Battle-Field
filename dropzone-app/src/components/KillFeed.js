import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

function formatEvent(event) {
  switch (event.type) {
    case 'kill':
      return `${event.actorName} eliminated ${event.targetName}`;
    case 'hit':
      return `${event.actorName} hit ${event.targetName} (-${event.damage})`;
    case 'zone_kill':
      return `Zone eliminated ${event.targetName}`;
    case 'zone_damage':
      return `Zone damaged ${event.targetName}`;
    case 'zone_shrink':
      return 'Zone is shrinking!';
    case 'player_revived':
      return `${event.targetName} was revived`;
    default:
      return '';
  }
}

export default function KillFeed({ events }) {
  const displayEvents = events
    .filter(e => ['kill', 'zone_kill', 'hit', 'zone_damage', 'zone_shrink', 'player_revived'].includes(e.type))
    .slice(0, 3);

  return (
    <View style={styles.container}>
      {displayEvents.map((event, index) => (
        <Text key={event.id || index} style={styles.eventText} numberOfLines={1}>
          {formatEvent(event)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  eventText: {
    color: '#cccccc',
    fontSize: 11,
    marginBottom: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
