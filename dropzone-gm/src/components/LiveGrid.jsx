import { useRef, useEffect } from 'react';

export default function LiveGrid({ players, zoneCenter, zoneRadius, gridSize = 100 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const scale = w / gridSize;

    ctx.clearRect(0, 0, w, h);

    // Background grid
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;
    const step = gridSize / 10;
    for (let i = 0; i <= gridSize; i += step) {
      const px = i * scale;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, px);
      ctx.lineTo(w, px);
      ctx.stroke();
    }

    // Zone circle
    if (zoneCenter && zoneRadius) {
      const cx = (zoneCenter.x ?? 50) * scale;
      const cy = (zoneCenter.y ?? 50) * scale;
      const r = zoneRadius * scale;

      ctx.save();
      ctx.fillStyle = 'rgba(220, 38, 38, 0.08)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Players
    players.forEach((player) => {
      if (!player.position) return;
      const x = (player.position.x ?? 0) * scale;
      const y = (player.position.y ?? 0) * scale;

      if (x < 0 || x > w || y < 0 || y > h) return;

      const isAlive = player.status === 'alive';
      const color = isAlive ? '#22c55e' : '#6b7280';

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, isAlive ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isAlive ? '#e5e7eb' : '#9ca3af';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(player.displayName || '?', x, y - 8);
    });
  }, [players, zoneCenter, zoneRadius, gridSize]);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden aspect-square">
      <canvas ref={canvasRef} width={500} height={500} className="w-full h-full" />
    </div>
  );
}
