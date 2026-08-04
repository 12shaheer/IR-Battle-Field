import React from 'react';
import { StyleSheet } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

const videoSource = require('../../assets/intro-bg.mp4');

export default function VideoBackground() {
  return (
    <Video
      source={videoSource}
      style={StyleSheet.absoluteFill}
      resizeMode={ResizeMode.COVER}
      shouldPlay
      isLooping
      isMuted
    />
  );
}
