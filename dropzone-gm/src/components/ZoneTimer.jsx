import { useState, useEffect } from 'react';

export default function ZoneTimer({ nextShrinkAt }) {
  const [timeLeft, setTimeLeft] = useState('--:--');

  useEffect(() => {
    const update = () => {
      if (!nextShrinkAt) {
        setTimeLeft('--:--');
        return;
      }
      const target = nextShrinkAt.toDate ? nextShrinkAt.toDate() : new Date(nextShrinkAt);
      const diff = Math.max(0, target.getTime() - Date.now());
      const seconds = Math.floor(diff / 1000);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      if (seconds <= 0) {
        setTimeLeft('SHRINKING');
      } else {
        setTimeLeft(`${mins}:${String(secs).padStart(2, '0')}`);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [nextShrinkAt]);

  return (
    <div className="text-center">
      <div className="text-xs text-gray-400 uppercase">Next Shrink</div>
      <div className={`text-lg font-mono font-bold ${timeLeft === 'SHRINKING' ? 'text-red-400' : 'text-orange-400'}`}>
        {timeLeft}
      </div>
    </div>
  );
}
