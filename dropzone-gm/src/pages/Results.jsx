import { useParams, Link } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { usePlayers } from '../hooks/usePlayers';
import { useEvents } from '../hooks/useEvents';
import { formatDuration } from '../utils/formatters';

export default function Results() {
  const { sessionId } = useParams();
  const { session, loading } = useSession(sessionId);
  const players = usePlayers(sessionId);
  const events = useEvents(sessionId);

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;
  if (!session) return <div className="p-6 text-red-400">Session not found</div>;

  const leaderboard = session.leaderboard?.length
    ? session.leaderboard
    : [...players].sort((a, b) => {
        if (a.status === 'alive' && b.status !== 'alive') return -1;
        if (b.status === 'alive' && a.status !== 'alive') return 1;
        return (b.kills || 0) - (a.kills || 0) || (b.damageDealt || 0) - (a.damageDealt || 0);
      });

  const totalKills = events.filter((e) => e.type === 'kill').length;
  const zoneShrinks = events.filter((e) => e.type === 'zone_shrink').length;
  const duration = session.startedAt && session.endedAt
    ? formatDuration(session.startedAt)
    : '--:--';

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">GAME OVER</h1>
        {session.winnerName && (
          <p className="text-2xl text-yellow-400 font-bold">
            {session.winnerName} wins!
          </p>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">{players.length}</div>
          <div className="text-xs text-gray-400 uppercase">Players</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">{duration}</div>
          <div className="text-xs text-gray-400 uppercase">Duration</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{totalKills}</div>
          <div className="text-xs text-gray-400 uppercase">Total Kills</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-400">{zoneShrinks}</div>
          <div className="text-xs text-gray-400 uppercase">Zone Shrinks</div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-700 bg-gray-850">
              <th className="p-3">#</th>
              <th className="p-3">Name</th>
              <th className="p-3">Kills</th>
              <th className="p-3">Damage</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((player, i) => (
              <tr key={player.id || player.playerId || i} className="border-b border-gray-800">
                <td className="p-3 text-gray-400 font-bold">{i + 1}</td>
                <td className="p-3 text-white font-medium">
                  {i === 0 && '👑 '}
                  {player.displayName}
                </td>
                <td className="p-3 text-red-300">{player.kills ?? 0}</td>
                <td className="p-3 text-gray-300">{player.damageDealt ?? 0}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    player.status === 'alive' ? 'bg-green-600' : 'bg-red-600'
                  }`}>
                    {player.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-center mt-8">
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
