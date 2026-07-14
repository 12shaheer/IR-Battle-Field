import { useState, useEffect } from 'react';
import { fetchSession, connectWebSocket } from '../utils/firebase';

export function useSession(sessionId) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    fetchSession(sessionId).then((data) => {
      setSession(data);
      setLoading(false);
    });

    const ws = connectWebSocket((msg) => {
      if (msg.sessionId === sessionId && msg.session) {
        setSession({ id: sessionId, ...msg.session });
      }
    });

    return () => ws.close();
  }, [sessionId]);

  return { session, loading };
}
