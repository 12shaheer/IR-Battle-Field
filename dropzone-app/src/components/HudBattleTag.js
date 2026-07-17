import React from 'react';
import { View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { encodeTag } from '../game/tags';

export default function HudBattleTag({ playerId }) {
  if (!playerId) return null;

  return (
    <View style={styles.container}>
      <View style={styles.qrCard}>
        <QRCode value={encodeTag(playerId)} size={50} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  qrCard: {
    backgroundColor: '#fff',
    padding: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.6)',
  },
});
