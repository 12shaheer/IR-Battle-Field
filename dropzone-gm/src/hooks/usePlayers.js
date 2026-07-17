import { useState, useEffect } from 'react';
import { fetchPlayers, connectWebSocket } from '../utils/api';

export function usePlayers(sessionId) {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (!sessionId) return;

    fetchPlayers(sessionId).then(setPlayers);

    const ws = connectWebSocket((msg) => {
      if (msg.sessionId === sessionId) {
        if (msg.session && msg.session.players) {
          setPlayers(Object.values(msg.session.players));
        }
        if (msg.type === 'player_joined' && msg.player) {
          setPlayers((prev) => [...prev.filter((p) => p.id !== msg.player.id), msg.player]);
        }
      }
    });

    return () => ws.close();
  }, [sessionId]);

  return players;
}
