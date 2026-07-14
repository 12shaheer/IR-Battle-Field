import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { callFunction } from '../utils/firebase';

export default function CreateSession() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    venueName: '',
    maxPlayers: 40,
    zoneCenterX: 50,
    zoneCenterY: 50,
    gridSize: 100,
    zoneRadius: 40,
    shrinkInterval: 300,
    shrinkAmount: 0.2,
    zoneDamage: 10,
  });

  const update = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await callFunction('createSession', {
        venueName: form.venueName || 'DropZone Arena',
        maxPlayers: Number(form.maxPlayers),
        zoneCenterX: Number(form.zoneCenterX),
        zoneCenterY: Number(form.zoneCenterY),
        zoneRadius: Number(form.zoneRadius),
        shrinkInterval: Number(form.shrinkInterval),
        shrinkAmount: Number(form.shrinkAmount),
        zoneDamage: Number(form.zoneDamage),
      });

      navigate(`/session/${result.data.sessionId}`);
    } catch (err) {
      setError(err.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Create New Session</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Venue Name</label>
          <input
            type="text"
            value={form.venueName}
            onChange={update('venueName')}
            placeholder="DropZone Arena"
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Max Players</label>
          <input
            type="number"
            value={form.maxPlayers}
            onChange={update('maxPlayers')}
            min={2}
            max={100}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Zone Center X</label>
            <input
              type="number"
              value={form.zoneCenterX}
              onChange={update('zoneCenterX')}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Zone Center Y</label>
            <input
              type="number"
              value={form.zoneCenterY}
              onChange={update('zoneCenterY')}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Grid Size (units)</label>
          <input
            type="number"
            value={form.gridSize}
            onChange={update('gridSize')}
            min={10}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Starting Zone Radius (grid units)</label>
          <input
            type="number"
            value={form.zoneRadius}
            onChange={update('zoneRadius')}
            min={5}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Zone Shrink Interval (seconds)</label>
          <input
            type="number"
            value={form.shrinkInterval}
            onChange={update('shrinkInterval')}
            min={30}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Shrink Amount (0.1 = 10%, 0.2 = 20%)</label>
          <input
            type="number"
            value={form.shrinkAmount}
            onChange={update('shrinkAmount')}
            step={0.05}
            min={0.05}
            max={0.9}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Zone Damage Per Shrink</label>
          <input
            type="number"
            value={form.zoneDamage}
            onChange={update('zoneDamage')}
            min={1}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-semibold disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating...' : 'Create Session'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
