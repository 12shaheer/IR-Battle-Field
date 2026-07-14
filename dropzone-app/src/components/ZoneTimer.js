import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ZoneTimer({ nextShrinkAt, shrinkIntervalSeconds, totalGameSeconds, startedAt }) {
  const [zoneTimeLeft, setZoneTimeLeft] = useState('--:--');
  const [gameTimeLeft, setGameTimeLeft] = useState('--:--');
  const [isShrinking, setIsShrinking] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const update = () => {
      if (!nextShrinkAt || !shrinkIntervalSeconds) {
        setZoneTimeLeft('--:--');
        setProgressPercent(0);
        return;
      }

      const target = typeof nextShrinkAt === 'number' ? nextShrinkAt : (nextShrinkAt.toDate ? nextShrinkAt.toDate().getTime() : new Date(nextShrinkAt).getTime());
      const diff = Math.max(0, target - Date.now());
      const seconds = Math.floor(diff / 1000);

      if (seconds <= 0) {
        setIsShrinking(true);
        setZoneTimeLeft('SHRINKING');
        setProgressPercent(0);
      } else {
        setIsShrinking(false);
        setZoneTimeLeft(formatTime(seconds));
        const percent = Math.min(100, Math.max(0, (seconds / shrinkIntervalSeconds) * 100));
        setProgressPercent(percent);
      }

      if (startedAt && totalGameSeconds) {
        const elapsedGame = Math.floor((Date.now() - startedAt) / 1000);
        const remaining = Math.max(0, totalGameSeconds - elapsedGame);
        setGameTimeLeft(formatTime(remaining));
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [nextShrinkAt, shrinkIntervalSeconds, startedAt, totalGameSeconds]);

  return (
    <View style={styles.container}>
      <Text style={styles.gameTime}>{gameTimeLeft}</Text>

      <View style={styles.zoneRow}>
        <Text style={styles.zoneLabel}>Zone Shrinking In </Text>
        <Text style={styles.zoneTime}>
          {isShrinking ? 'SHRINKING' : zoneTimeLeft}
        </Text>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${progressPercent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  gameTime: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  zoneLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
  },
  zoneTime: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '500',
  },
  barTrack: {
    width: 100,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(120, 120, 120, 0.3)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#2fb89a',
  },
});