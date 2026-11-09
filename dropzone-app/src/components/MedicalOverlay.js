import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { encodeTag } from '../game/tags';
import { LIME } from './PregameChrome';
export default function MedicalOverlay({ medical, player }) {
  const [permission, requestPermission] = useCameraPermissions();
  if (medical.mode === 'closed') return null;
  const locked = medical.mode === 'healing';
  return <View style={styles.overlay}>
    <View style={styles.header}><Text style={styles.heading}>FIRST AID</Text><Text style={styles.health}>{player?.health || 0} / 100 HP</Text>{!locked && <Pressable accessibilityRole="button" accessibilityLabel="Close first aid" onPress={() => medical.action('closed')}><Text style={styles.close}>×</Text></Pressable>}</View>
    <View style={styles.body}>
      {medical.mode === 'menu' && <>
        <Text style={styles.title}>WATCH EACH OTHER'S BACK.</Text><Text style={styles.note}>You can take damage in first aid. Shooting is disabled.</Text>
        <View style={styles.actions}><Pressable accessibilityRole="button" accessibilityLabel="Receive healing" disabled={player?.health >= 100} onPress={() => medical.action('receive')} style={[styles.button, player?.health >= 100 && styles.disabled]}><Text style={styles.buttonTitle}>RECEIVE HEALING</Text><Text style={styles.buttonNote}>Show a fresh, single-use QR</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Heal teammate" disabled={!player?.medkits} onPress={() => medical.action('scan')} style={[styles.button, !player?.medkits && styles.disabled]}><Text style={styles.buttonTitle}>HEAL TEAMMATE</Text><Text style={styles.buttonNote}>{player?.medkits || 0} first-aid kit remaining</Text></Pressable></View>
      </>}
      {medical.mode === 'receive' && <><Text style={styles.title}>LET A TEAMMATE SCAN YOUR QR</Text>{medical.offer?.qr ? <View style={styles.qr}><QRCode value={medical.offer.qr} size={150} quietZone={10} /></View> : <Text style={styles.note}>Generating your healing QR…</Text>}<Text style={styles.note}>Only works while this screen is open · {Math.ceil(medical.expiresIn)}s</Text></>}
      {medical.mode === 'scan' && <><Text style={styles.title}>SCAN YOUR TEAMMATE'S HEALING QR</Text><View style={styles.camera}>{permission?.granted ? <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => medical.scan(data)} /> : <Pressable accessibilityRole="button" accessibilityLabel="Enable healing camera" onPress={requestPermission}><Text style={styles.buttonTitle}>ENABLE CAMERA</Text></Pressable>}</View><Text style={styles.note}>A valid scan locks both players here for five seconds.</Text></>}
      {locked && <><Text style={styles.title}>HEALING IN PROGRESS</Text><Text style={styles.countdown}>{Math.ceil(medical.remaining)}</Text><Text style={styles.note}>{player?.healPartner} · Stay alive. You can move, but cannot shoot.</Text><Text style={styles.note}>The kit is used only when healing completes.</Text></>}
      {medical.error ? <Text accessibilityRole="alert" style={styles.error}>{medical.error}</Text> : null}
    </View>
    {player?.id && <View pointerEvents="none" style={{ position: 'absolute', right: 20, bottom: 20, backgroundColor: '#fff', padding: 5 }}><QRCode value={encodeTag(player.id)} size={68} /></View>}
  </View>;
}
const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,13,20,0.97)', padding: 22 }, header: { flexDirection: 'row', alignItems: 'center', gap: 24 }, heading: { color: LIME, fontWeight: '900', fontSize: 18, letterSpacing: 2 }, health: { color: '#fff', marginLeft: 'auto', fontWeight: '800' }, close: { color: '#fff', fontSize: 30 }, body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, title: { color: '#fff', fontSize: 17, fontWeight: '900', fontStyle: 'italic', textAlign: 'center' }, note: { color: '#b4b3bf', fontSize: 11, textAlign: 'center' }, actions: { flexDirection: 'row', gap: 18, marginTop: 20 }, button: { backgroundColor: '#30263e', borderWidth: 1, borderColor: '#8e7aab', padding: 22, borderRadius: 12, gap: 8 }, buttonTitle: { color: LIME, fontWeight: '900', fontSize: 13 }, buttonNote: { color: '#bdb2cc', fontSize: 11 }, disabled: { opacity: 0.3 }, qr: { backgroundColor: '#fff', padding: 4, borderRadius: 8 }, camera: { width: 210, height: 170, backgroundColor: '#252131', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderRadius: 10 }, countdown: { color: LIME, fontSize: 70, fontWeight: '900' }, error: { color: '#ffb6c6', fontSize: 11, textAlign: 'center' },
});
