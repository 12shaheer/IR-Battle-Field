import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';

const backgroundImage = require('../../assets/Intro.jpeg');

export default function StartScreen({ navigation }) {

  return (
    <ImageBackground source={backgroundImage} style={styles.container} resizeMode="cover">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.logo}>DROPZONE</Text>
          <Text style={styles.subtitle}>BATTLE ROYALE</Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.replace('MainMenu')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>TAP TO CONTINUE</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 8,
    textShadowColor: 'rgba(150, 50, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 25,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 10,
    marginTop: 8,
  },
  button: {
    position: 'absolute',
    bottom: 50,
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
  buttonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 3,
  },
});
