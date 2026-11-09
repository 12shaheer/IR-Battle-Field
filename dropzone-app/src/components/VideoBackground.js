import React from 'react';
import { Image, StyleSheet } from 'react-native';

const bgImage = require('../../assets/Main Menu background image.jpeg');

export default function VideoBackground() {
  return (
    <Image
      source={bgImage}
      style={styles.bg}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  bg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
});
