import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { parseGunQR, setPairedGun } from '../game/gunPairing';

export default function GunPairScreen({ navigation }) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [gunInfo, setGunInfo] = useState(null);

  const handleBarcodeScanned = ({ data }) => {
    if (scanned) return;

    const gun = parseGunQR(data);
    if (!gun) return;

    setScanned(true);
    setGunInfo(gun);
    setPairedGun(gun);
  };

  const handleContinue = () => {
    navigation.replace('Lobby');
  };

  const handleRescan = () => {
    setScanned(false);
    setGunInfo(null);
  };

  const handleSkip = () => {
    navigation.replace('Lobby');
  };

  if (!cameraPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.statusText}>Initializing camera...</Text>
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Camera Required</Text>
        <Text style={styles.statusText}>
          Camera permission is needed to scan the gun QR code.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
          <Text style={styles.buttonText}>GRANT PERMISSION</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip (QR-only mode)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (scanned && gunInfo) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>GUN PAIRED</Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Gun ID</Text>
          <Text style={styles.infoValue}>{gunInfo.gunId}</Text>
          <Text style={styles.infoLabel}>Transmitter</Text>
          <Text style={styles.infoValue}>{gunInfo.transmitter}</Text>
          <Text style={styles.infoLabel}>Receiver</Text>
          <Text style={styles.infoValue}>{gunInfo.receiver}</Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>CONTINUE TO LOBBY</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rescanButton} onPress={handleRescan}>
          <Text style={styles.rescanText}>Scan Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PAIR YOUR GUN</Text>
      <Text style={styles.subtitle}>Scan the QR code on your gun</Text>

      <View style={styles.cameraContainer}>
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

      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip (QR-only mode)</Text>
      </TouchableOpacity>
    </View>
  );
}

const CORNER_SIZE = 20;
const CORNER_WIDTH = 3;
const CYAN = '#3ee0e8';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
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
    color: '#888',
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
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 20,
    marginVertical: 20,
    width: '80%',
    maxWidth: 300,
  },
  infoLabel: {
    color: '#888',
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
    color: '#666',
    fontSize: 13,
  },
  rescanButton: {
    marginTop: 12,
    padding: 10,
  },
  rescanText: {
    color: '#888',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
