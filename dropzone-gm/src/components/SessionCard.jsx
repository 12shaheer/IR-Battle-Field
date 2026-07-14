import { Link } from 'react-router-dom';
import { formatDate } from '../utils/formatters';

const statusColors = {
  lobby: 'bg-blue-600',
  active: 'bg-green-600',
  ended: 'bg-gray-600',
};

export default function SessionCard({ session }) {
  const linkTo = session.status === 'ended'
    ? `/results/${session.id}`
    : `/session/${session.id}`;

  return (
    <Link
      to={linkTo}
      className="block bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-500 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-white">{session.venueName || 'Unnamed Session'}</h3>
        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${statusColors[session.status] || 'bg-gray-600'}`}>
          {session.status}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span>Code: <span className="font-mono text-yellow-400">{session.joinCode}</span></span>
        <span>{formatDate(session.createdAt)}</span>
      </div>
    </Link>
  );
}
