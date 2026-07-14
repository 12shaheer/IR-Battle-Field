import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { usePlayers } from '../hooks/usePlayers';
import { useEvents } from '../hooks/useEvents';
import { callFunction } from '../utils/firebase';
import { formatDuration } from '../utils/formatters';
import JoinCodeDisplay from '../components/JoinCodeDisplay';
import ZoneTimer from '../components/ZoneTimer';
import LiveGrid from '../components/LiveGrid';
import PlayerTable from '../components/PlayerTable';
import EventLog from '../components/EventLog';

export default function SessionManagement() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { session, loading } = useSession(sessionId);
  const players = usePlayers(sessionId);
  const events = useEvents(sessionId);

  const [elapsed, setElapsed] = useState('00:00');
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  useEffect(() => {
    if (!session?.startedAt || session.status !== 'active') return;
    const tick = () => setElapsed(formatDuration(session.startedAt));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session?.startedAt, session?.status]);

  useEffect(() => {
    if (session?.status === 'ended') {
      navigate(`/results/${sessionId}`, { replace: true });
    }
  }, [session?.status, sessionId, navigate]);

  const handleStart = async () => {
    setStarting(true);
    try {
      await callFunction('startGame', { sessionId });
    } catch (e) {
      alert('Failed to start: ' + (e.message || 'Unknown error'));
    } finally {
      setStarting(false);
    }
  };

  const handleEnd = async () => {
    setEnding(true);
    try {
      await callFunction('endGameManually', { sessionId });
    } catch (e) {
      alert('Failed to end: ' + (e.message || 'Unknown error'));
    } finally {
      setEnding(false);
      setShowEndConfirm(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-400">Loading session...</div>;
  }

  if (!session) {
    return <div className="p-6 text-red-400">Session not found</div>;
  }

  const canStart = session.status === 'lobby' && players.length >= 1;

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 bg-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-xl font-bold text-white">{session.venueName}</h1>
            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
              session.status === 'lobby' ? 'bg-blue-600' :
              session.status === 'active' ? 'bg-green-600' : 'bg-gray-600'
            }`}>
              {session.status}
            </span>
          </div>
          <JoinCodeDisplay code={session.joinCode} />
          {session.status === 'active' && (
            <>
              <div className="text-center">
                <div className="text-xs text-gray-400 uppercase">Elapsed</div>
                <div className="text-lg font-mono font-bold text-white">{elapsed}</div>
              </div>
              <ZoneTimer nextShrinkAt={session.nextShrinkAt} />
            </>
          )}
        </div>
        <div className="flex gap-3">
          {session.status === 'lobby' && (
            <button
              onClick={handleStart}
              disabled={!canStart || starting}
              className="px-5 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {starting ? 'Starting...' : `START GAME (${players.length} players)`}
            </button>
          )}
          {session.status === 'active' && !showEndConfirm && (
            <button
              onClick={() => setShowEndConfirm(true)}
              className="px-5 py-2 bg-red-700 hover:bg-red-600 rounded-lg font-bold transition-colors"
            >
              END GAME
            </button>
          )}
          {showEndConfirm && (
            <div className="flex items-center gap-2">
              <span className="text-red-400 text-sm">End game?</span>
              <button
                onClick={handleEnd}
                disabled={ending}
                className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded font-bold text-sm disabled:opacity-50"
              >
                {ending ? '...' : 'CONFIRM'}
              </button>
              <button
                onClick={() => setShowEndConfirm(false)}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content: grid + sidebar */}
      <div className="grid grid-cols-3 gap-4">
        {/* Left: Live Grid */}
        <div className="col-span-2">
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-2">Live Grid</h2>
          <LiveGrid
            players={players}
            zoneCenter={session.zoneCenter}
            zoneRadius={session.zoneRadius}
            gridSize={100}
          />
        </div>

        {/* Right: Event Log */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-2">Event Log</h2>
          <EventLog events={events} />
        </div>
      </div>

      {/* Player Table */}
      <div className="mt-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase mb-2">
          Players ({players.length})
        </h2>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <PlayerTable players={players} sessionId={sessionId} />
        </div>
      </div>
    </div>
  );
}
