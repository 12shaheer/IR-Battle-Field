import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { callFunction } from '../utils/firebase';
import { saveSession, getUser, lockUsername } from '../utils/storage';
import { useGame } from '../context/GameContext';
import { BackButton, LockIcon, LIME } from '../components/PregameChrome';
import { MODES } from '../components/ModeArtwork';
import { CinematicBackdrop, MotionEntrance, AmbientEffects } from '../components/PregameMotion';

export default function JoinScreen({ navigation, route }) {
  const { setSessionId, setPlayerId } = useGame();
  const [joinCode, setJoinCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [usernameLocked, setUsernameLocked] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const canonicalName = useRef('');
  const { width, height } = useWindowDimensions();
  const safe = useSafeAreaInsets();
  const wide = width > height;
  const mode = MODES[route?.params?.mode] || MODES.solo;
  useEffect(() => {
    let active = true;
    getUser().then(user => {
      if (active && user?.name) { canonicalName.current = user.name;setDisplayName(user.name);setUsernameLocked(true); }
      if (active) setProfileReady(true);
    }).catch(() => { if (active) setError('Could not load your saved username. Please reopen this screen.'); });
    return () => { active = false; };
  }, []);
  const commitUsername = async (enteredName = displayName) => {
    if (!profileReady || enteredName.trim().length < 2) return '';
    try {
      const name = await lockUsername(canonicalName.current || enteredName);
      canonicalName.current = name;setDisplayName(name);setUsernameLocked(true);
      return name;
    } catch (e) { setError(e.message || 'Could not save your username.');return ''; }
  };
  const isValid = mode.available && profileReady && /^\d{6}$/.test(joinCode) && displayName.trim().length >= 2;
  const handleJoin = async () => {
    if (!isValid || loading) return;
    setLoading(true);setError('');
    try {
      const name = await commitUsername();
      if (!name) return;
      const result = await callFunction('joinSession', { joinCode: joinCode.trim(), displayName: name });
      const { sessionId, playerId } = result.data;
      await saveSession(sessionId, playerId);
      setSessionId(sessionId);setPlayerId(playerId);
      navigation.replace('GunPair');
    } catch (e) {
      const message = e.message || 'Could not join the game. Please try again.';
      if (message.includes('not found')) setError('Game not found. Check your game code.');
      else if (message.includes('already started') || message.includes('active')) setError('This game has already started.');
      else if (message.includes('full')) setError('This game is full.');
      else setError(message);
    } finally { setLoading(false); }
  };
  return <View style={styles.page}>
    <CinematicBackdrop source={mode.image} />
    <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs><LinearGradient id="join-scrim" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#080b1e" stopOpacity="0.12" /><Stop offset="0.45" stopColor="#0f0827" stopOpacity="0.38" /><Stop offset="1" stopColor="#100725" stopOpacity="0.92" /></LinearGradient></Defs>
      <Rect width="100%" height="100%" fill="url(#join-scrim)" />
    </Svg>
    <AmbientEffects />
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: Math.max(safe.top + 12, 18), paddingBottom: Math.max(safe.bottom + 14, 18), paddingLeft: Math.max(safe.left + 24, 32), paddingRight: Math.max(safe.right + 24, 32) }]}>
        <View style={styles.header}><BackButton onPress={() => navigation.goBack()} /><Text style={styles.step}>01 / PLAYER DETAILS     →     02 / GUN QR</Text></View>
        <View style={[styles.body, !wide && styles.column]}>
          <MotionEntrance delay={80} style={[styles.intro, { width: wide ? '45%' : '100%' }]}>
            <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.eyebrow}>SOLO / ONLINE ARENA</Text></View>
            <Text style={[styles.title, { fontSize: wide ? Math.min(46, height * 0.092) : 32 }]}>{mode.title.replace(' BATTLE', '\nBATTLE')}</Text>
            <Text style={styles.tagline}>One arena. One survivor.{ '\n' }Make every shot count.</Text>
          </MotionEntrance>
          <MotionEntrance delay={170} style={[styles.form, { width: wide ? '45%' : '100%', padding: height < 420 ? 16 : 24 }]}>
            <Text style={styles.formTitle}>JOIN THE ARENA</Text>
            <View style={styles.field}><View style={styles.labelRow}><Text style={styles.label}>USERNAME</Text>{usernameLocked && <View style={styles.lockLabel}><LockIcon size={10} color={LIME} /><Text style={styles.lockText}>SAVED</Text></View>}</View>
              <TextInput accessibilityLabel="Username" style={[styles.input, usernameLocked && styles.lockedInput]} placeholder="Choose your username" placeholderTextColor="#afa6c3" value={displayName} onChangeText={text => { if (!canonicalName.current) { setDisplayName(text);setError(''); } }} onBlur={event => commitUsername(event.nativeEvent.text || displayName)} maxLength={20} autoCapitalize="none" autoCorrect={false} editable={profileReady && !loading && !usernameLocked} />
              <Text style={styles.usernameHint}>{usernameLocked ? 'Your username is saved and cannot be changed.' : 'Choose once. Saved when you finish this field.'}</Text>
            </View>
            <View style={styles.field}><Text style={styles.label}>GAME CODE</Text><TextInput accessibilityLabel="Game code" style={[styles.input, styles.code]} placeholder="000000" placeholderTextColor="#afa6c3" value={joinCode} onChangeText={text => { setJoinCode(text.replace(/[^0-9]/g, '').slice(0, 6));setError(''); }} keyboardType="number-pad" maxLength={6} autoComplete="off" editable={!loading} onSubmitEditing={handleJoin} /></View>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Continue to gun QR" accessibilityState={{ disabled: !isValid || loading, busy: loading }} disabled={!isValid || loading} onPress={handleJoin} style={({ pressed }) => [styles.button, (!isValid || loading) && styles.disabled, pressed && { opacity: 0.8 }]}>
              {loading ? <ActivityIndicator color="#24113c" /> : <><Text style={styles.buttonText}>CONTINUE</Text><Text style={styles.buttonText}>→</Text></>}
            </Pressable>
            <Text style={styles.next}>NEXT: SCAN YOUR GUN'S QR CODE</Text>
          </MotionEntrance>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </View>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#100725' }, flex: { flex: 1 }, content: { flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  step: { color: '#e3d5f9', fontSize: 8, letterSpacing: 1, fontWeight: '700' },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 24, paddingVertical: 8 }, column: { flexDirection: 'column', gap: 24 },
  intro: { alignSelf: 'flex-end', paddingBottom: 14 }, liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }, liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: LIME },
  eyebrow: { color: LIME, fontSize: 8, letterSpacing: 2, fontWeight: '800', textShadowColor: '#100725', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  title: { color: '#fff', fontStyle: 'italic', fontWeight: '900', letterSpacing: 0.3, textShadowColor: '#100725', textShadowRadius: 12, textShadowOffset: { width: 0, height: 2 } },
  tagline: { color: '#eee4ff', fontSize: 11, lineHeight: 17, marginTop: 10, textShadowColor: '#100725', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  form: { maxWidth: 440, backgroundColor: 'rgba(24,12,47,0.89)', borderWidth: 1, borderColor: 'rgba(207,180,255,0.4)', borderRadius: 16 },
  formTitle: { color: '#fff', fontSize: 17, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1, marginBottom: 12 },
  field: { marginBottom: 10 }, labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: '#ebdcff', fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 5 }, lockLabel: { flexDirection: 'row', gap: 4, alignItems: 'center', marginBottom: 5 }, lockText: { color: LIME, fontSize: 7, letterSpacing: 1, fontWeight: '800' },
  input: { backgroundColor: 'rgba(6,4,20,0.55)', borderWidth: 1, borderColor: '#78608f', borderRadius: 7, color: '#fff', fontSize: 16, paddingHorizontal: 14, paddingVertical: 10 },
  lockedInput: { borderColor: 'rgba(222,255,0,0.25)', color: '#e3e8c7' }, usernameHint: { color: '#bfb0d3', fontSize: 8, marginTop: 5 }, code: { letterSpacing: 7, fontWeight: '700' }, error: { color: '#ffe1e7', fontSize: 11, marginBottom: 8 },
  button: { backgroundColor: LIME, borderWidth: 2, borderColor: '#f0ff9c', borderRadius: 7, paddingVertical: 11, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 }, disabled: { opacity: 0.4 }, buttonText: { color: '#24113c', fontSize: 15, fontWeight: '900', letterSpacing: 2 }, next: { color: '#c4a1ed', fontSize: 8, letterSpacing: 1, marginTop: 9, textAlign: 'center' },
});
