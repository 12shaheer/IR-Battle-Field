import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  Image,
  ScrollView,
} from 'react-native';
import { callFunction } from '../utils/firebase';
import { saveSession } from '../utils/storage';
import { useGame } from '../context/GameContext';

const backgroundImage = require('../../assets/Player App background.jpeg');

const CHARACTERS = [
  { id: 'homer', name: 'Homer Simpson', image: require('../../assets/Homer Simpson.jpeg') },
  { id: 'peter', name: 'Peter Griffin', image: require('../../assets/Peter Griffin.jpeg') },
  { id: 'gojo', name: 'Satoru Gojo', image: require('../../assets/Satoru Gojo.webp') },
  { id: 'inosuke', name: 'Inosuke Hashibira', image: require('../../assets/Inosuke Hashibira.jpeg') },
];

export default function JoinScreen({ navigation }) {
  const { setSessionId, setPlayerId, setSelectedCharacter } = useGame();
  const [joinCode, setJoinCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedChar, setSelectedChar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid = joinCode.length === 6 && /^\d{6}$/.test(joinCode) && displayName.trim().length >= 2 && selectedChar;

  const handleJoin = async () => {
    if (!isValid || loading) return;

    setLoading(true);
    setError('');

    try {
      const result = await callFunction('joinSession', {
        joinCode: joinCode.trim(),
        displayName: displayName.trim(),
      });

      const { sessionId, playerId } = result.data;

      await saveSession(sessionId, playerId);
      setSessionId(sessionId);
      setPlayerId(playerId);
      setSelectedCharacter(selectedChar);
      navigation.replace('Lobby');
    } catch (e) {
      const message = e.message || 'Failed to join session';
      if (message.includes('not found')) {
        setError('Session not found. Check your join code.');
      } else if (message.includes('already started') || message.includes('active')) {
        setError('This game has already started.');
      } else if (message.includes('full')) {
        setError('This session is full.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={backgroundImage} style={styles.container} resizeMode="cover">
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>JOIN GAME</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Enter Join Code (6 digits)"
              placeholderTextColor="#888"
              value={joinCode}
              onChangeText={(text) => {
                setJoinCode(text.replace(/[^0-9]/g, '').slice(0, 6));
                setError('');
              }}
              keyboardType="number-pad"
              maxLength={6}
            />

            <TextInput
              style={styles.input}
              placeholder="Enter Your Name"
              placeholderTextColor="#888"
              value={displayName}
              onChangeText={(text) => {
                setDisplayName(text);
                setError('');
              }}
              maxLength={20}
              autoCapitalize="none"
            />
          </View>

          {/* Character Selection */}
          <Text style={styles.charHeading}>CHOOSE YOUR CHARACTER</Text>

          <View style={styles.charGrid}>
            {CHARACTERS.map((char) => (
              <TouchableOpacity
                key={char.id}
                style={[
                  styles.charOption,
                  selectedChar === char.id && styles.charOptionSelected,
                ]}
                onPress={() => setSelectedChar(char.id)}
                activeOpacity={0.7}
              >
                <Image source={char.image} style={styles.charImage} />
                {selectedChar === char.id && (
                  <View style={styles.charCheckmark}>
                    <Text style={styles.charCheckmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={handleJoin}
            disabled={!isValid || loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>JOIN GAME</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 4,
    marginBottom: 30,
    textShadowColor: 'rgba(0, 200, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  form: {
    width: '100%',
    maxWidth: 320,
  },
  input: {
    backgroundColor: 'rgba(20, 20, 40, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(100, 100, 150, 0.5)',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  charHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
    marginTop: 24,
    marginBottom: 16,
    textShadowColor: 'rgba(0, 200, 255, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  charGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  charOption: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  charOptionSelected: {
    borderColor: '#00e5ff',
    borderWidth: 3,
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  charImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  charCheckmark: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#00e5ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  charCheckmarkText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  error: {
    color: '#ff4444',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    backgroundColor: 'rgba(200, 0, 0, 0.85)',
    borderRadius: 10,
    paddingHorizontal: 40,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 100, 0.4)',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(80, 0, 0, 0.6)',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});
