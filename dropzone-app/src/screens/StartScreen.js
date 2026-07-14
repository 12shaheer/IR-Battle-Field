import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';

const backgroundImage = require('../../assets/Player App background.jpeg');

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
          onPress={() => navigation.replace('Join')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>START GAME</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 32,
  },
  content: {
    alignItems: 'center',
    marginTop: 60,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 6,
    textShadowColor: 'rgba(0, 200, 255, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 8,
    marginTop: 8,
  },
  button: {
    backgroundColor: 'rgba(200, 0, 0, 0.85)',
    paddingHorizontal: 50,
    paddingVertical: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 100, 0.4)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
});
