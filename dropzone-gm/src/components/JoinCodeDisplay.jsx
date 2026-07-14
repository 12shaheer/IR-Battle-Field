export default function JoinCodeDisplay({ code }) {
  if (!code) return null;

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg px-6 py-3 text-center">
      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Join Code</div>
      <div className="text-3xl font-mono font-bold text-yellow-400 tracking-widest">{code}</div>
    </div>
  );
}
