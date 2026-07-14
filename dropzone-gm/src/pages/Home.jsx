import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchSessions, connectWebSocket } from '../utils/firebase';
import SessionCard from '../components/SessionCard';

export default function Home() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions().then((data) => {
      setSessions(data);
      setLoading(false);
    });

    const ws = connectWebSocket((msg) => {
      if (msg.type === 'session_created' || msg.type === 'session_update') {
        fetchSessions().then(setSessions);
      }
    });

    return () => ws.close();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">DropZone</h1>
          <p className="text-gray-400">Game Master Dashboard</p>
        </div>
        <Link
          to="/create"
          className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-semibold transition-colors"
        >
          + Create New Session
        </Link>
      </div>

      {loading && <p className="text-gray-400">Loading sessions...</p>}

      {!loading && sessions.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">No sessions yet</p>
          <p className="mt-2">Create your first session to get started</p>
        </div>
      )}

      <div className="space-y-3">
        {sessions.map((s) => (
          <SessionCard key={s.id} session={s} />
        ))}
      </div>
    </div>
  );
}
