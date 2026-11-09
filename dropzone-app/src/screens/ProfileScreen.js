import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { callFunction } from '../utils/firebase';
import { saveUser, getUser, lockUsername } from '../utils/storage';
import { CinematicBackdrop, MotionEntrance } from '../components/PregameMotion';

const GENDERS = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
];

export default function ProfileScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [usernameLocked, setUsernameLocked] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [userId, setUserId] = useState('');
  const [gender, setGender] = useState(null);
  const [avatarUri, setAvatarUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getUser().then((user) => {
      if (user) {
        setUsername(user.name || '');
        setUsernameLocked(!!user.name);
        setUserId(user.userId || '');
        setGender(user.gender || null);
        setAvatarUri(user.avatarUri || null);
      }
      setProfileReady(true);
    }).catch(() => setError('Could not load your profile. Please reopen it.'));
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const commitUsername = async (enteredName = username) => {
    if (!profileReady || enteredName.trim().length < 2) return;
    try {
      const saved = await lockUsername(enteredName);
      setUsername(saved);setUsernameLocked(true);
    } catch (e) { setError(e.message || 'Could not save your username.'); }
  };
  const handleSave = async () => {
    if (!profileReady || loading) return;
    if (username.trim().length < 2) { setError('Username must be at least 2 characters.');return; }
    setLoading(true);setError('');
    try {
      const name = await lockUsername(username);
      setUsername(name);setUsernameLocked(true);
      let assignedId = userId;
      if (!assignedId) {
        try {
          const result = await callFunction('checkUsername', { username: name, deviceId: Constants.installationId || Constants.sessionId || 'unknown' });
          if (result.data?.userId) assignedId = result.data.userId;
        } catch (_) { /* Offline profile details still save with the fixed local identity. */ }
      }
      await saveUser({ name, userId: assignedId, gender, avatarUri });
      navigation.goBack();
    } catch (e) { setError(e.message || 'Could not save your profile. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <CinematicBackdrop source={require('../../assets/Main Menu background image.jpeg')} />
      <ScrollView contentContainerStyle={styles.overlay} keyboardShouldPersistTaps="handled">
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to home" style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>BACK</Text>
        </TouchableOpacity>

        <MotionEntrance delay={80} style={styles.card}>
          <Text style={styles.title}>EDIT PROFILE</Text>

          {/* Avatar picker */}
          <TouchableOpacity style={styles.avatarPicker} onPress={pickImage}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>+</Text>
              </View>
            )}
            <Text style={styles.avatarHint}>Tap to change</Text>
          </TouchableOpacity>

          {/* Username */}
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#888"
            value={username}
            onChangeText={(text) => { if (!usernameLocked) { setUsername(text);setError(''); } }}
            onBlur={event => commitUsername(event.nativeEvent.text || username)}
            editable={profileReady && !usernameLocked && !loading}
            accessibilityLabel="Profile username"
            maxLength={20}
            autoCapitalize="none"
          />

<Text style={styles.userIdHint}>{usernameLocked ? 'Username saved. It cannot be changed.' : 'Choose once. Saved when you finish this field.'}</Text>
          {/* Existing player ID */}
          {userId ? (
            <Text style={styles.userIdDisplay}>{userId}</Text>
          ) : (
            <Text style={styles.userIdHint}>PLAYER PROFILE</Text>
          )}

          {/* Gender selection */}
          <View style={styles.genderRow}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[styles.genderOption, gender === g.id && styles.genderSelected]}
                onPress={() => setGender(g.id)}
              >
                <Text style={[styles.genderText, gender === g.id && styles.genderTextSelected]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.saveButton, loading && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={loading || !profileReady}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.saveButtonText}>SAVE</Text>
            )}
          </TouchableOpacity>
        </MotionEntrance>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flexGrow: 1,
    paddingVertical: 64,
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
    padding: 28,
    alignItems: 'center',
    width: 340,
    borderWidth: 1,
    borderColor: 'rgba(150, 50, 255, 0.3)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 4,
    marginBottom: 20,
    textShadowColor: 'rgba(150, 50, 255, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  avatarPicker: {
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#3FC1D6',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3FC1D6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarPlaceholderText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  avatarHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginTop: 6,
  },
  input: {
    backgroundColor: 'rgba(30, 30, 60, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(150, 50, 255, 0.4)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    width: '100%',
    textAlign: 'center',
  },
  userIdDisplay: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 10,
  },
  userIdHint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 10,
    fontStyle: 'italic',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  genderOption: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(30,30,60,0.6)',
  },
  genderSelected: {
    borderColor: '#b44dff',
    backgroundColor: 'rgba(150, 50, 255, 0.3)',
  },
  genderText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  genderTextSelected: {
    color: '#fff',
  },
  error: {
    color: '#ff4444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingHorizontal: 50,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
});
