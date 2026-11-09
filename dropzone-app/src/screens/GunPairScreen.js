import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, PermissionsAndroid, ScrollView, useWindowDimensions } from 'react-native';
import { MotionEntrance, AmbientEffects } from '../components/PregameMotion';
import { PurpleBackdrop, LIME } from '../components/PregameChrome';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { partyCall } from '../game/teamParty';
import { parseGunQR, setPairedGun } from '../game/gunPairing';
import { connectTagger, scanAndVerifyDevice } from '../game/ir';
import { RX_SERVICE_UUID, teardownIRHardware } from '../game/irSetup';

function SetupFrame({ children }) {
  return <View style={styles.page}><PurpleBackdrop /><AmbientEffects /><ScrollView contentContainerStyle={styles.container}><MotionEntrance delay={80} style={{ width: '100%', alignItems: 'center' }}><Text style={styles.step}>02 / GUN SETUP</Text>{children}</MotionEntrance></ScrollView></View>;
}
export default function GunPairScreen({ navigation, route }) {
  const { height } = useWindowDimensions();
  const cameraSize = Math.max(130, Math.min(240, height - 170));
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const scanning = useRef(false);
  const [scanned, setScanned] = useState(false);
  const [gunInfo, setGunInfo] = useState(null);
  const [bleState, setBleState] = useState('idle'); // 'idle' | 'connecting' | 'connected' | 'failed'
  const [bleError, setBleError] = useState(null);

  const handleBarcodeScanned = async ({ data }) => {
    if (scanning.current) return;

    const gun = parseGunQR(data);
    if (!gun) return;

    scanning.current = true;
    setScanned(true);
    setGunInfo(gun);
    setPairedGun(gun);

    // Immediately attempt BLE connection to verify gun is reachable
    setBleState('connecting');
    setBleError(null);

    try {
      if (Platform.OS === 'android' && Platform.Version < 31) {
        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (result !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('Location permission is required for Bluetooth scanning');
      }
      if (Platform.OS === 'android' && Platform.Version >= 31) {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);
        const granted = Object.values(result).every(
          (v) => v === PermissionsAndroid.RESULTS.GRANTED
        );
        if (!granted) {
          setBleState('failed');
          setBleError('Bluetooth permissions denied');
          return;
        }
      }

      const transmitter = await connectTagger();
      if (transmitter) {
        let receiver = null;
        if (gun.receiver !== gun.transmitter) {
          receiver = await scanAndVerifyDevice(gun.receiver, RX_SERVICE_UUID);
          if (!receiver) throw new Error(`Receiver ${gun.receiver} not found nearby`);
          // Keep both verified links; gameplay reuses them.
        }
        setBleState('connected');
      } else {
        setBleState('failed');
        setBleError('Gun not found nearby');
      }
    } catch (err) {
      setBleState('failed');
      setBleError(err.message || 'Connection failed');
    }
  };

  const finishSetup = async (gun) => {
    if (route?.params?.party) {
      try { await partyCall('readyParty', { ready: true, gunId: gun?.gunId || 'QR-only' });navigation.goBack(); }
      catch (error) { setBleError(error.message);setBleState('failed'); }
    } else navigation.replace('Lobby');
  };
  const handleContinue = () => finishSetup(gunInfo);

  const handleRescan = () => {
    teardownIRHardware();
    setPairedGun(null);
    scanning.current = false;
    setScanned(false);
    setGunInfo(null);
    setBleState('idle');
    setBleError(null);
  };

  const handleSkip = () => {
    teardownIRHardware();
    setPairedGun(null);
    finishSetup(null);
  };

  if (!cameraPermission) {
    return (
      <SetupFrame>
        <Text style={styles.statusText}>Initializing camera...</Text>
      </SetupFrame>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <SetupFrame>
        <Text style={styles.title}>Camera Required</Text>
        <Text style={styles.statusText}>
          Camera permission is needed to scan the gun QR code.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
          <Text style={styles.buttonText}>GRANT PERMISSION</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Continue without gun" style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip (QR-only mode)</Text>
        </TouchableOpacity>
      </SetupFrame>
    );
  }

  if (scanned && gunInfo) {
    return (
      <SetupFrame>
        <Text style={styles.title}>GUN PAIRED</Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Gun ID</Text>
          <Text style={styles.infoValue}>{gunInfo.gunId}</Text>
          <Text style={styles.infoLabel}>Transmitter</Text>
          <Text style={styles.infoValue}>{gunInfo.transmitter}</Text>
          <Text style={styles.infoLabel}>Receiver</Text>
          <Text style={styles.infoValue}>{gunInfo.receiver}</Text>

          {/* BLE connection status */}
          <View style={styles.bleStatusRow}>
            {bleState === 'connecting' && (
              <>
                <ActivityIndicator size="small" color={CYAN} />
                <Text style={styles.bleStatusText}>Verifying gun connection...</Text>
              </>
            )}
            {bleState === 'connected' && (
              <Text style={styles.bleStatusSuccess}>Gun responding</Text>
            )}
            {bleState === 'failed' && (
              <Text style={styles.bleStatusFailed}>{bleError || 'Connection failed'}</Text>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleContinue} disabled={bleState === 'connecting'}>
          <Text style={styles.buttonText}>{route?.params?.party ? 'READY — RETURN TO PARTY' : 'CONTINUE TO LOBBY'}</Text>
        </TouchableOpacity>

        {bleState === 'failed' && (
          <Text style={styles.bleHint}>
            Gun not reachable — you can still continue. The game will retry when it starts.
          </Text>
        )}

        <TouchableOpacity style={styles.rescanButton} onPress={handleRescan} disabled={bleState === 'connecting'}>
          <Text style={styles.rescanText}>Scan Again</Text>
        </TouchableOpacity>
      </SetupFrame>
    );
  }

  return (
    <SetupFrame>
      <Text style={styles.title}>PAIR YOUR GUN</Text>
      <Text style={styles.subtitle}>Scan the QR code on your gun</Text>

      <View style={[styles.cameraContainer, { width: cameraSize, height: cameraSize }]}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={styles.scanOverlay}>
          <View style={styles.scanCornerTL} />
          <View style={styles.scanCornerTR} />
          <View style={styles.scanCornerBL} />
          <View style={styles.scanCornerBR} />
        </View>
      </View>

      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Continue without gun" style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip (QR-only mode)</Text>
      </TouchableOpacity>
    </SetupFrame>
  );
}

const CORNER_SIZE = 20;
const CORNER_WIDTH = 3;
const CYAN = LIME;

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#4b00b1' },
  step: { color: '#d6b9f3', fontSize: 9, letterSpacing: 3, marginBottom: 12, fontWeight: '800' },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    color: CYAN,
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    color: '#d6b9f3',
    fontSize: 14,
    marginBottom: 20,
  },
  statusText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
  },
  cameraContainer: {
    width: 250,
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanCornerTL: {
    position: 'absolute',
    top: 30,
    left: 30,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: CYAN,
  },
  scanCornerTR: {
    position: 'absolute',
    top: 30,
    right: 30,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: CYAN,
  },
  scanCornerBL: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: CYAN,
  },
  scanCornerBR: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: CYAN,
  },
  infoBox: {
    backgroundColor: 'rgba(27,0,66,0.6)',
    borderRadius: 10,
    padding: 20,
    marginVertical: 20,
    width: '80%',
    maxWidth: 300,
  },
  infoLabel: {
    color: '#d6b9f3',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 10,
  },
  infoValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  bleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  bleStatusText: {
    color: CYAN,
    fontSize: 13,
  },
  bleStatusSuccess: {
    color: '#4cff88',
    fontSize: 13,
    fontWeight: 'bold',
  },
  bleStatusFailed: {
    color: '#ff6b6b',
    fontSize: 13,
  },
  bleHint: {
    color: '#d6b9f3',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: CYAN,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: '#0a0a1a',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 1,
  },
  skipButton: {
    marginTop: 20,
    padding: 10,
  },
  skipText: {
    color: '#d6b9f3',
    fontSize: 13,
  },
  rescanButton: {
    marginTop: 12,
    padding: 10,
  },
  rescanText: {
    color: '#d6b9f3',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
