import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { callFunction } from '../utils/firebase';
import { saveSession, getUser } from '../utils/storage';
import { useGame } from '../context/GameContext';
import VideoBackground from '../components/VideoBackground';

export default function JoinScreen({ navigation }) {
  const { setSessionId, setPlayerId } = useGame();
  const [joinCode, setJoinCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getUser().then((user) => {
      if (user && user.name) setDisplayName(user.name);
    });
  }, []);

  const isValid = joinCode.length === 6 && /^\d{6}$/.test(joinCode) && displayName.trim().length >= 2;

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
      navigation.replace('GunPair');
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
    <View style={styles.container}>
      <VideoBackground />
      <View style={styles.overlay}>
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.replace('MainMenu')}>
          <Text style={styles.backText}>BACK</Text>
        </TouchableOpacity>

        {/* Center card */}
        <View style={styles.card}>
          <Text style={styles.title}>JOIN GAME</Text>

          <TextInput
            style={styles.input}
            placeholder="Your Name"
            placeholderTextColor="#888"
            value={displayName}
            onChangeText={(text) => {
              setDisplayName(text);
              setError('');
            }}
            maxLength={20}
            autoCapitalize="words"
          />

          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="Enter 6-digit Join Code"
            placeholderTextColor="#888"
            value={joinCode}
            onChangeText={(text) => {
              setJoinCode(text.replace(/[^0-9]/g, '').slice(0, 6));
              setError('');
            }}
            keyboardType="number-pad"
            maxLength={6}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={handleJoin}
            disabled={!isValid || loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>JOIN</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  backText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  card: {
    backgroundColor: 'rgba(10, 10, 30, 0.85)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: 320,
    borderWidth: 1,
    borderColor: 'rgba(150, 50, 255, 0.3)',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 4,
    marginBottom: 24,
    textShadowColor: 'rgba(150, 50, 255, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  input: {
    backgroundColor: 'rgba(30, 30, 60, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(150, 50, 255, 0.4)',
    borderRadius: 8,
    padding: 14,
    fontSize: 18,
    color: '#fff',
    width: '100%',
    textAlign: 'center',
  },
  codeInput: {
    letterSpacing: 6,
    marginTop: 12,
  },
  error: {
    color: '#ff4444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  button: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingHorizontal: 50,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    opacity: 0.6,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
});
