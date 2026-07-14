import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { encodeTag } from '../game/tags';

// Shows the player's unique QR "battle tag". Players print this (or show it on
// another screen) and wear it, so opponents can aim at it to score a hit.
export default function BattleTag({ playerId, size = 150 }) {
  if (!playerId) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>YOUR BATTLE TAG</Text>
      <View style={styles.card}>
        <QRCode value={encodeTag(playerId)} size={size} />
      </View>
      <Text style={styles.hint}>Print or show this so others can tag you</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginTop: 16,
  },
  label: {
    color: '#00ff00',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
  },
  hint: {
    color: '#888',
    fontSize: 12,
    marginTop: 10,
  },
});
