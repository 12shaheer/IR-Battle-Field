import { useState, useEffect } from 'react';
import { fetchEvents, connectWebSocket } from '../utils/api';

export function useEvents(sessionId) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!sessionId) return;

    fetchEvents(sessionId).then(setEvents);

    const ws = connectWebSocket((msg) => {
      if (msg.sessionId === sessionId && msg.type === 'event' && msg.event) {
        setEvents((prev) => [msg.event, ...prev].slice(0, 100));
      }
    });

    return () => ws.close();
  }, [sessionId]);

  return events;
}
