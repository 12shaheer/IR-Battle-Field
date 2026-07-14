import { useRef, useEffect } from 'react';
import { formatTimestamp } from '../utils/formatters';

const typeColors = {
  kill: 'text-red-400',
  zone_kill: 'text-orange-400',
  zone_damage: 'text-orange-300',
  zone_shrink: 'text-orange-400',
  hit: 'text-yellow-300',
  game_started: 'text-blue-400',
  game_ended: 'text-blue-400',
  player_revived: 'text-green-400',
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

export default function EventLog({ events }) {
  const topRef = useRef(null);

  useEffect(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events.length]);

  return (
    <div className="h-64 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg p-3 space-y-1">
      <div ref={topRef} />
      {events.length === 0 && (
        <p className="text-gray-500 text-center py-4">No events yet</p>
      )}
      {events.map((event) => (
        <div key={event.id} className="flex gap-2 text-xs">
          <span className="text-gray-500 shrink-0">{formatTimestamp(event.timestamp)}</span>
          <span className={typeColors[event.type] || 'text-gray-300'}>
            {describeEvent(event)}
          </span>
        </div>
      ))}
    </div>
  );
}
