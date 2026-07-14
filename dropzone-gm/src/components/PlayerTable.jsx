import { useState } from 'react';
import { callFunction } from '../utils/firebase';
import HealthBar from './HealthBar';

export default function PlayerTable({ players, sessionId }) {
  const [reviving, setReviving] = useState(null);

  const sorted = [...players].sort((a, b) => {
    if (a.status === 'alive' && b.status !== 'alive') return -1;
    if (b.status === 'alive' && a.status !== 'alive') return 1;
    return (b.kills || 0) - (a.kills || 0);
  });

  const handleRevive = async (playerId) => {
    setReviving(playerId);
    try {
      await callFunction('revivePlayer', { sessionId, playerId });
    } catch (e) {
      alert('Revive failed: ' + (e.message || 'Unknown error'));
    } finally {
      setReviving(null);
    }
  };

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-700">
            <th className="pb-2 pr-3">Player</th>
            <th className="pb-2 pr-3">Health</th>
            <th className="pb-2 pr-3">Ammo</th>
            <th className="pb-2 pr-3">Kills</th>
            <th className="pb-2 pr-3">Damage</th>
            <th className="pb-2 pr-3">Status</th>
            <th className="pb-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((player) => (
            <tr key={player.id} className="border-b border-gray-800">
              <td className="py-2 pr-3 font-medium text-white">{player.displayName}</td>
              <td className="py-2 pr-3"><HealthBar health={player.health ?? 0} /></td>
              <td className="py-2 pr-3 text-gray-300">{player.ammo ?? 0}/{player.maxAmmo ?? 30}</td>
              <td className="py-2 pr-3 text-gray-300">{player.kills ?? 0}</td>
              <td className="py-2 pr-3 text-gray-300">{player.damageDealt ?? 0}</td>
              <td className="py-2 pr-3">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${player.status === 'alive' ? 'bg-green-600' : 'bg-red-600'}`}>
                  {player.status}
                </span>
              </td>
              <td className="py-2">
                {player.status === 'eliminated' && (
                  <button
                    onClick={() => handleRevive(player.id)}
                    disabled={reviving === player.id}
                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded disabled:opacity-50"
                  >
                    {reviving === player.id ? '...' : 'Revive'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {players.length === 0 && (
        <p className="text-gray-500 text-center py-4">No players yet</p>
      )}
    </div>
  );
}
