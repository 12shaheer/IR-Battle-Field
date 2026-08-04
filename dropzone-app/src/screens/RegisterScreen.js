import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { callFunction } from '../utils/firebase';
import { saveUser } from '../utils/storage';
import VideoBackground from '../components/VideoBackground';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameStatus, setUsernameStatus] = useState(null);

  const isValid =
    name.trim().length >= 2 &&
    username.trim().length >= 3 &&
    /^[a-zA-Z0-9_]+$/.test(username) &&
    dateOfBirth.length === 10 &&
    phoneNumber.trim().length >= 8 &&
    usernameStatus !== 'taken';

  const formatDOB = (text) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const checkUsername = async (value) => {
    const trimmed = value.trim();
    if (trimmed.length < 3) {
      setUsernameStatus(null);
      return;
    }
    try {
      const result = await callFunction('checkUsername', { username: trimmed });
      setUsernameStatus(result.data.available ? 'available' : 'taken');
    } catch {
      setUsernameStatus(null);
    }
  };

  const handleRegister = async () => {
    if (!isValid || loading) return;

    setLoading(true);
    setError('');

    try {
      const result = await callFunction('register', {
        name: name.trim(),
        username: username.trim(),
        dateOfBirth,
        phoneNumber: phoneNumber.trim(),
      });

      const { userId, user } = result.data;
      await saveUser({ userId, ...user });
      navigation.replace('Start');
    } catch (e) {
      const message = e.message || 'Registration failed';
      if (message.includes('already taken')) {
        setError('That username is already taken.');
        setUsernameStatus('taken');
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
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>CREATE ACCOUNT</Text>
          <Text style={styles.subtitle}>Join the battle</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#888"
              value={name}
              onChangeText={(text) => { setName(text); setError(''); }}
              maxLength={30}
              autoCapitalize="words"
            />

            <View>
              <TextInput
                style={[
                  styles.input,
                  usernameStatus === 'taken' && styles.inputError,
                  usernameStatus === 'available' && styles.inputSuccess,
                ]}
                placeholder="Username"
                placeholderTextColor="#888"
                value={username}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^a-zA-Z0-9_]/g, '');
                  setUsername(cleaned);
                  setError('');
                  setUsernameStatus(null);
                }}
                onBlur={() => checkUsername(username)}
                maxLength={20}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {usernameStatus === 'taken' && (
                <Text style={styles.fieldError}>Username taken</Text>
              )}
              {usernameStatus === 'available' && (
                <Text style={styles.fieldSuccess}>Available</Text>
              )}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Date of Birth (DD/MM/YYYY)"
              placeholderTextColor="#888"
              value={dateOfBirth}
              onChangeText={(text) => {
                setDateOfBirth(formatDOB(text));
                setError('');
              }}
              keyboardType="number-pad"
              maxLength={10}
            />

            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor="#888"
              value={phoneNumber}
              onChangeText={(text) => { setPhoneNumber(text); setError(''); }}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={!isValid || loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 4,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 200, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
    marginBottom: 30,
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
  },
  inputError: {
    borderColor: '#ff4444',
  },
  inputSuccess: {
    borderColor: '#00e5ff',
  },
  fieldError: {
    color: '#ff4444',
    fontSize: 11,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },
  fieldSuccess: {
    color: '#00e5ff',
    fontSize: 11,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
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
