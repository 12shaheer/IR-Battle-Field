import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Modal, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { useGame } from '../context/GameContext';
import { getUser, lockUsername } from '../utils/storage';
import { partyCall, restoreParty, forgetParty, decodePartyInvite } from '../game/teamParty';
import { BackButton, LIME } from '../components/PregameChrome';
import { MotionEntrance, CinematicBackdrop } from '../components/PregameMotion';
import { MODES } from '../components/ModeArtwork';

function Button({ label, onPress, disabled, secondary }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} accessibilityState={{ disabled: !!disabled }} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, disabled && { opacity: 0.35 }, pressed && { opacity: 0.75 }]}><Text style={[styles.buttonText, secondary && { color: '#fff' }]}>{label}</Text></Pressable>;
}
export default function TeamPartyScreen({ navigation }) {
  const { setSessionId, setPlayerId } = useGame();
  const [data, setData] = useState(null), [username, setUsername] = useState(''), [needName, setNeedName] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [modal, setModal] = useState(null);
  const [inviteCode, setInviteCode] = useState(''), [gameCode, setGameCode] = useState(''), [teamName, setTeamName] = useState('');
  const [qrVisible, setQrVisible] = useState(true);
  const [permission, requestPermission] = useCameraPermissions();
  const joined = useRef(false), scanning = useRef(false);
  const safe = useSafeAreaInsets(), { width, height } = useWindowDimensions();
  const party = data?.party, me = data?.me;
  const accept = useCallback(result => {
    setData(result);
    if (result.me?.sessionId && result.me?.playerId && !joined.current) {
      joined.current = true;setSessionId(result.me.sessionId);setPlayerId(result.me.playerId);navigation.replace('Lobby');
    }
  }, [navigation, setSessionId, setPlayerId]);
  useEffect(() => {
    let active = true;
    (async () => {
      const user = await getUser();if (!active) return;
      if (!user?.name) { setNeedName(true);return; }
      setUsername(user.name);
      const saved = await restoreParty();
      if (saved) {
        try { const result = await partyCall('getParty');if (active) accept(result);return; }
        catch (e) { if (e.status !== 403 && e.status !== 404) throw e;await forgetParty(); }
      }
      const result = await partyCall('createParty', { displayName: user.name });
      if (active) accept(result);
    })().catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [accept]);
  useFocusEffect(useCallback(() => {
    if (!party?.id) return;
    let active = true, pending = false;
    const poll = async () => {
      if (pending || joined.current) return;pending = true;
      try { const result = await partyCall('getParty');if (active) { accept(result);setConnectionError(''); } }
      catch (e) { if (active) setConnectionError(e.message); }
      finally { pending = false; }
    };
    poll();const timer = setInterval(poll, 1000);
    return () => { active = false;clearInterval(timer); };
  }, [party?.id, accept]));
  const run = async action => { if (busy) return;setBusy(true);setError('');try { await action(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const create = () => run(async () => {
    const name = await lockUsername(username);setUsername(name);setNeedName(false);accept(await partyCall('createParty', { displayName: name }));
  });
  const join = value => run(async () => {
    scanning.current = true;
    try { accept(await partyCall('joinParty', { displayName: username, invite: value }));setModal(null); }
    finally { scanning.current = false; }
  });
  const leave = () => run(async () => { if (party) await partyCall('leaveParty');await forgetParty();navigation.goBack(); });
  const pair = () => run(async () => { if (!party) return;await partyCall('readyParty', { ready: false });navigation.navigate('GunPair', { party: true }); });
  const enter = () => run(async () => accept(await partyCall('joinTeamMatch', { joinCode: gameCode, teamName: teamName.trim() })));
  const allReady = party?.members.length >= 2 && party.members.every(m => m.ready);
  const outer = { paddingTop: Math.max(12, safe.top + 8), paddingBottom: Math.max(12, safe.bottom + 8), paddingLeft: Math.max(24, safe.left + 16), paddingRight: Math.max(24, safe.right + 16) };
  const qrSize = Math.max(105, Math.min(180, height * 0.36));
  if (needName) return <View style={[styles.screen, styles.center]}><CinematicBackdrop source={MODES.team.image} /><View style={styles.form}>
    <Text style={styles.title}>YOUR SQUAD STARTS HERE</Text><Text style={styles.note}>Choose your permanent username.</Text>
    <TextInput accessibilityLabel="Party username" placeholder="Username" placeholderTextColor="#8b8995" style={styles.input} value={username} maxLength={20} onChangeText={setUsername} />
    <Button label="CREATE PARTY" disabled={busy || username.trim().length < 2} onPress={create} />{error ? <Text style={styles.error}>{error}</Text> : null}
  </View></View>;
  return <View style={[styles.screen, outer]}>
    <View pointerEvents="none" style={styles.floor} />
    <View style={styles.header}>
      <BackButton label="LEAVE" onPress={leave} />
      <View style={styles.tab}><Text style={styles.tabTitle}>TEAM DEATHMATCH</Text><Text style={styles.tabSub}>PARTY ASSEMBLY</Text></View>
      <View><Text style={styles.count}>{party?.members.length || 1} / 10 PLAYERS</Text><Text style={styles.small}>{me?.leader ? 'YOU ARE THE LEADER' : 'WAITING FOR YOUR LEADER'}</Text></View>
    </View>
    {error || connectionError ? <Text accessibilityRole="alert" style={styles.error}>{error || connectionError}</Text> : null}
    {!party && !error ? <ActivityIndicator color={LIME} style={{ margin: 25 }} /> : null}
    {!party && error ? <Button label="RETRY PARTY" onPress={create} disabled={busy} /> : null}
    <View style={styles.body}>
      {party && qrVisible && <MotionEntrance delay={100} style={styles.invite}>
        <Text style={styles.section}>INVITE YOUR SQUAD</Text>
        <View style={styles.qr}><QRCode value={data.invite} size={qrSize} backgroundColor="#fff" color="#000" quietZone={8} /></View>
        <Text selectable style={styles.inviteCode}>{party.inviteCode}</Text><Text style={styles.note}>Scan this QR or enter the party code.</Text>
      </MotionEntrance>}
      <ScrollView style={styles.rosterScroll} contentContainerStyle={styles.roster}>
        {Array.from({ length: 10 }, (_, i) => {
          const member = party?.members[i];
          return <View key={member?.id || i} style={[styles.slot, { minHeight: Math.max(48, Math.min(78, (height - 145) / 5)) }, member?.id === party?.leaderId && styles.leader]}>
            {member ? <><View style={[styles.avatar, member.ready && styles.avatarReady]}><Text style={styles.initial}>{member.displayName[0].toUpperCase()}</Text></View><View style={styles.memberCopy}><Text numberOfLines={1} style={styles.memberName}>{member.displayName}{member.id === me?.id ? ' (You)' : ''}</Text><Text style={[styles.small, member.ready && { color: LIME }]}>{member.ready ? 'READY · ' + member.gunLabel : 'GUN SETUP NEEDED'}</Text></View>{member.id === party.leaderId && <Text style={styles.crown}>♛</Text>}</>
              : <><View style={styles.plus}><Text style={styles.plusText}>+</Text></View><Text style={styles.waiting}>Waiting for player…</Text></>}
          </View>;
        })}
      </ScrollView>
    </View>
    <View style={styles.footer}>
      <Button label={qrVisible ? 'HIDE QR' : 'SHOW QR'} secondary onPress={() => setQrVisible(v => !v)} />
      <Button label="JOIN A PARTY" secondary disabled={busy || !party} onPress={() => setModal('join')} />
      <Button label={party?.members.find(m => m.id === me?.id)?.ready ? 'CHANGE GUN' : 'PAIR GUN'} secondary disabled={busy || !party} onPress={pair} />
      <View style={styles.footerHint}><Text style={styles.note}>{me?.leader ? allReady ? 'Your squad is ready.' : '2–10 members. Everyone must mark ready.' : 'Your leader enters the game code for everyone.'}</Text></View>
      {me?.leader ? <Button label="READY →" disabled={busy || !allReady} onPress={() => setModal('match')} /> : <Text style={styles.memberReady}>WAITING FOR LEADER</Text>}
    </View>
    <Modal visible={modal !== null} transparent animationType="fade" onRequestClose={() => { if (!busy) setModal(null); }}>
      <View style={styles.modal}>
        {modal === 'match' && <CinematicBackdrop source={MODES.team.image} />}
        <View style={[styles.form, modal === 'join' && width > height && { maxWidth: 620 }]}>
          <View style={styles.formHeader}><Text style={styles.title}>{modal === 'join' ? 'JOIN YOUR PARTY' : 'ENTER THE MATCH'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close party dialog" disabled={busy} onPress={() => setModal(null)}><Text style={styles.close}>×</Text></Pressable></View>
          {modal === 'join' ? <>
            <View style={styles.joinRow}>
              <View style={styles.scanBox}>{permission?.granted ? <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data: value }) => { const invite = decodePartyInvite(value);if (invite && !scanning.current && !busy) join(invite); }} /> : <Button label="ENABLE CAMERA" onPress={requestPermission} />}</View>
              <View style={{ flex: 1, gap: 12 }}><Text style={styles.note}>Scan the leader’s QR code, or enter their party code below. You won’t need the match code.</Text><TextInput accessibilityLabel="Party code" style={styles.input} placeholder="PARTY CODE" placeholderTextColor="#8b8995" value={inviteCode} onChangeText={v => setInviteCode(v.toUpperCase().slice(0, 8))} autoCapitalize="characters" maxLength={8} /><Button label="JOIN PARTY" disabled={busy || inviteCode.length !== 8} onPress={() => join(inviteCode)} /></View>
            </View>
          </> : <>
            <Text style={styles.note}>{party?.members.length} ready players will enter together.</Text>
            <Text style={styles.fieldLabel}>GAME CODE</Text><TextInput accessibilityLabel="Team game code" style={styles.input} value={gameCode} onChangeText={v => setGameCode(v.replace(/\D/g, '').slice(0, 6))} placeholder="000000" placeholderTextColor="#8b8995" keyboardType="number-pad" maxLength={6} />
            <Text style={styles.fieldLabel}>TEAM NAME</Text><TextInput accessibilityLabel="Team name" style={styles.input} value={teamName} onChangeText={setTeamName} placeholder="Your team name" placeholderTextColor="#8b8995" maxLength={24} />
            <Button label="ENTER GAME" disabled={busy || gameCode.length !== 6 || teamName.trim().length < 2} onPress={enter} />
          </>}
          {busy && <ActivityIndicator color={LIME} />}{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        </View>
      </View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#18181e' }, center: { justifyContent: 'center', alignItems: 'center' },
  floor: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '16%', backgroundColor: '#292731', borderTopWidth: 1, borderColor: '#44414d' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 13, borderBottomWidth: 1, borderColor: '#414047' },
  tab: { backgroundColor: LIME, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, paddingHorizontal: 28, paddingVertical: 11, alignItems: 'center', marginTop: -18 },
  tabTitle: { color: '#22220b', fontSize: 17, fontWeight: '900', fontStyle: 'italic' }, tabSub: { color: '#526000', fontSize: 8, fontWeight: '800', letterSpacing: 2, marginTop: 3 },
  count: { color: '#fff', fontSize: 12, fontWeight: '800', textAlign: 'right' }, small: { color: '#96949d', fontSize: 8, marginTop: 5 },
  body: { flex: 1, flexDirection: 'row', gap: 22, paddingVertical: 10 }, invite: { justifyContent: 'center', alignItems: 'center', gap: 9, maxWidth: '29%' },
  section: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 2 }, qr: { backgroundColor: '#fff', padding: 4, borderWidth: 2, borderColor: LIME, borderRadius: 5 }, inviteCode: { color: LIME, fontSize: 14, fontWeight: '900', letterSpacing: 3 },
  note: { color: '#b1aebc', fontSize: 10, lineHeight: 15, textAlign: 'center' }, rosterScroll: { flex: 1 }, roster: { flexDirection: 'row', flexWrap: 'wrap' },
  slot: { width: '50%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 9, borderBottomWidth: 1, borderColor: '#3a393f', borderLeftWidth: 2, borderLeftColor: 'transparent' },
  leader: { borderLeftColor: LIME, backgroundColor: '#222228' }, avatar: { height: 34, width: 34, borderRadius: 6, backgroundColor: '#49405c', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#726482' }, avatarReady: { borderColor: LIME }, initial: { color: '#fff', fontSize: 17, fontWeight: '900' }, memberCopy: { flex: 1 }, memberName: { color: '#fff', fontSize: 12, fontWeight: '700' }, crown: { color: LIME, fontSize: 21 },
  plus: { width: 30, height: 30, borderWidth: 2, borderColor: '#77747e', borderRadius: 6, justifyContent: 'center', alignItems: 'center' }, plusText: { color: '#aaa6b2', fontSize: 27, lineHeight: 29 }, waiting: { color: '#77747e', fontSize: 10 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8 }, footerHint: { flex: 1 }, memberReady: { color: LIME, fontSize: 9, fontWeight: '800' },
  button: { backgroundColor: LIME, borderRadius: 9, paddingHorizontal: 16, paddingVertical: 12, minHeight: 42, justifyContent: 'center', alignItems: 'center' }, buttonText: { color: '#252515', fontSize: 11, fontWeight: '900', letterSpacing: 1 }, secondary: { backgroundColor: '#34313e', borderWidth: 1, borderColor: '#5a5267' },
  modal: { flex: 1, backgroundColor: 'rgba(6,5,12,0.91)', justifyContent: 'center', alignItems: 'center', padding: 22 }, form: { padding: 22, borderWidth: 1, borderColor: '#5d526d', backgroundColor: 'rgba(26,23,35,0.95)', borderRadius: 15, gap: 12, width: '100%', maxWidth: 390 }, formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { color: '#fff', fontSize: 18, fontWeight: '900', fontStyle: 'italic' }, close: { color: '#fff', fontSize: 26 }, input: { backgroundColor: '#100e19', borderWidth: 1, borderColor: '#6b5b7d', borderRadius: 6, paddingHorizontal: 13, paddingVertical: 11, color: '#fff', fontSize: 16 }, fieldLabel: { color: '#cbc3d6', fontSize: 9, letterSpacing: 2, fontWeight: '800' }, error: { color: '#ffb5c5', fontSize: 11, paddingVertical: 6, textAlign: 'center' }, joinRow: { flexDirection: 'row', alignItems: 'center', gap: 18 }, scanBox: { height: 175, width: 175, backgroundColor: '#100e19', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 10 },
});
