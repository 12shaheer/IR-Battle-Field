import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useGame } from '../context/GameContext';
import { decodeTag } from '../game/tags';
import { tagSpotted } from '../game/targeting';
import { setupIRHardware, teardownIRHardware } from '../game/irSetup';
import { playSound, loadSounds } from '../utils/sounds';
import HealthBar from '../components/HealthBar';
import AmmoCounter from '../components/AmmoCounter';
import ZoneTimer from '../components/ZoneTimer';
import DemoMap from '../components/DemoMap';
import KillFeed from '../components/KillFeed';
import ShootButton from '../components/ShootButton';
import HudBattleTag from '../components/HudBattleTag';

export default function GameHUD({ navigation }) {
  const { sessionId, playerId, sessionData, playerData, players, recentEvents, isConnected, selectedCharacter } = useGame();
  const [position, setPosition] = useState(null);
  const prevHealth = useRef(playerData?.health);
  const hitFlash = useRef(new Animated.Value(0)).current;
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [lockedTarget, setLockedTarget] = useState(null);
  const lockTimer = useRef(null);

  const handleBarcodeScanned = ({ data }) => {
    const spottedId = decodeTag(data);
    if (!spottedId || spottedId === playerId) return;

    const enemy = players.find(
      (p) => p.id === spottedId && p.status === 'alive'
    );
    if (!enemy) return;

    tagSpotted(enemy.id);
    setLockedTarget(enemy.displayName);

    if (lockTimer.current) clearTimeout(lockTimer.current);
    lockTimer.current = setTimeout(() => setLockedTarget(null), 1500);
  };

  useEffect(() => {
    return () => {
      if (lockTimer.current) clearTimeout(lockTimer.current);
    };
  }, []);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
    loadSounds();

    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  // Connect to IR blaster + receiver over BLE when the game screen mounts
  const playersReady = players.length > 0;
  useEffect(() => {
    console.log('[IR] GameHUD effect check:', { sessionId, playerId, playersReady, playersLength: players.length });
    if (!sessionId || !playerId || !playersReady) return;

    setupIRHardware({ players, myPlayerId: playerId, sessionId });

    return () => { teardownIRHardware(); };
  }, [sessionId, playerId, playersReady]);

  useEffect(() => {
    if (!cameraPermission?.granted && !cameraPermission?.canAskAgain === false) {
      requestCameraPermission();
    }
  }, [cameraPermission]);

  useEffect(() => {
    if (playerData?.health != null && prevHealth.current != null) {
      if (playerData.health < prevHealth.current) {
        playSound('hit');
        Animated.sequence([
          Animated.timing(hitFlash, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(hitFlash, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start();

        if (playerData.health <= 25 && playerData.health > 0) {
          playSound('lowhealth');
        }
      }
    }
    prevHealth.current = playerData?.health;
  }, [playerData?.health]);

  useEffect(() => {
    if (sessionData?.nextShrinkAt) {
      const diff = sessionData.nextShrinkAt - Date.now();
      if (diff <= 0 && diff > -2000) {
        playSound('zoneWarning');
      }
    }
  }, [sessionData?.zoneRadius]);

  useEffect(() => {
    if (playerData?.status === 'eliminated' || playerData?.health === 0) {
      navigation.replace('Eliminated');
    }
  }, [playerData?.status, playerData?.health]);

  useEffect(() => {
    if (sessionData?.status === 'ended') {
      navigation.replace('Results');
    }
  }, [sessionData?.status]);

  const alivePlayers = players.filter(p => p.status === 'alive');

  if (!cameraPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Initializing camera...</Text>
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Required</Text>
        <Text style={styles.permissionText}>
          DropZone needs access to your camera to display the AR viewfinder. Please grant camera permission in your device settings to continue playing.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarcodeScanned}
      />

      {/* Damage vignette — red gradient on screen edges */}
      <Animated.View style={[styles.damageVignette, { opacity: hitFlash }]} pointerEvents="none">
        <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="top" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="red" stopOpacity="0.9" />
              <Stop offset="1" stopColor="red" stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="bottom" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor="red" stopOpacity="0.9" />
              <Stop offset="1" stopColor="red" stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="left" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="red" stopOpacity="0.9" />
              <Stop offset="1" stopColor="red" stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="right" x1="1" y1="0" x2="0" y2="0">
              <Stop offset="0" stopColor="red" stopOpacity="0.9" />
              <Stop offset="1" stopColor="red" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="30%" fill="url(#top)" />
          <Rect x="0" y="70%" width="100%" height="30%" fill="url(#bottom)" />
          <Rect x="0" y="0" width="20%" height="100%" fill="url(#left)" />
          <Rect x="80%" y="0" width="20%" height="100%" fill="url(#right)" />
        </Svg>
      </Animated.View>


      {/* Crosshair */}
      <View style={styles.crosshairContainer} pointerEvents="none">
        <View style={styles.crosshairRing}>
          <View style={styles.crosshairDot} />
        </View>
        <View style={[styles.crosshairLine, styles.crosshairTop]} />
        <View style={[styles.crosshairLine, styles.crosshairBottom]} />
        <View style={[styles.crosshairLine, styles.crosshairLeft]} />
        <View style={[styles.crosshairLine, styles.crosshairRight]} />
        {lockedTarget && (
          <View style={styles.targetLockBox}>
            <Text style={styles.targetLockText}>◉ TARGET LOCKED: {lockedTarget}</Text>
          </View>
        )}
      </View>

      {/* Reconnecting banner */}
      {!isConnected && (
        <View style={styles.disconnectBanner}>
          <Text style={styles.disconnectText}>Reconnecting...</Text>
        </View>
      )}

      {/* === TOP LEFT: Demo Map === */}
      <View style={styles.topLeft}>
        <DemoMap playerPosition={playerData?.position} />
      </View>

      {/* === TOP CENTER: Timer + alive count === */}
      <View style={styles.topCenter}>
        <View style={styles.timerBox}>
          <ZoneTimer
            nextShrinkAt={sessionData?.nextShrinkAt}
            shrinkIntervalSeconds={sessionData?.shrinkInterval}
            totalGameSeconds={sessionData?.shrinkInterval ? sessionData.shrinkInterval * 4 : null}
            startedAt={sessionData?.startedAt}
          />
        </View>
        <View style={styles.aliveBox}>
          <Text style={styles.aliveLabel}>remaining </Text>
          <Text style={styles.aliveCount}>{alivePlayers.length}</Text>
        </View>
      </View>

      {/* === TOP RIGHT: Player's QR battle tag (opponents scan this to hit you) === */}
      <View style={styles.topRight}>
        <HudBattleTag playerId={playerId} />
      </View>

      {/* === BOTTOM LEFT: Player character avatar + health bars === */}
      <View style={styles.bottomLeft}>
        <HealthBar health={playerData?.health ?? 100} characterId={selectedCharacter} />
      </View>

      {/* === BOTTOM RIGHT: Gun + ammo counter === */}
      <View style={styles.bottomRight}>
        <AmmoCounter ammo={playerData?.ammo ?? 30} maxAmmo="∞" />
      </View>

      {/* === BOTTOM CENTER: Shoot button === */}
      <View style={styles.bottomCenter}>
        <ShootButton />
      </View>

      {/* Kill feed */}
      <View style={styles.killFeedContainer}>
        <KillFeed events={recentEvents} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    color: '#ff4444',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  permissionText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  damageVignette: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  crosshairContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  crosshairRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 229, 255, 0.9)',
  },
  crosshairLine: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 229, 255, 0.5)',
  },
  targetLockBox: {
    // Absolutely positioned so appearing/disappearing never nudges the
    // crosshair, which is flex-centered in the same container.
    position: 'absolute',
    top: '50%',
    marginTop: 44,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 60, 60, 0.9)',
  },
  targetLockText: {
    color: '#ff5c5c',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  crosshairTop: {
    width: 1.5,
    height: 12,
    top: '50%',
    marginTop: -30,
  },
  crosshairBottom: {
    width: 1.5,
    height: 12,
    top: '50%',
    marginTop: 18,
  },
  crosshairLeft: {
    height: 1.5,
    width: 12,
    left: '50%',
    marginLeft: -30,
  },
  crosshairRight: {
    height: 1.5,
    width: 12,
    left: '50%',
    marginLeft: 18,
  },
  disconnectBanner: {
    backgroundColor: '#cc6600',
    padding: 6,
    alignItems: 'center',
    position: 'absolute',
    top: 10,
    left: '35%',
    right: '35%',
    borderRadius: 6,
    zIndex: 50,
  },
  disconnectText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  topLeft: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 20,
  },
  topCenter: {
    position: 'absolute',
    top: 10,
    left: '50%',
    marginLeft: -70,
    width: 140,
    alignItems: 'center',
    zIndex: 20,
  },
  timerBox: {
    marginBottom: 4,
  },
  aliveBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 3,
  },
  aliveLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
  },
  aliveCount: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  topRight: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 20,
  },
  bottomLeft: {
    position: 'absolute',
    bottom: 14,
    left: 12,
    zIndex: 20,
  },
  bottomRight: {
    position: 'absolute',
    bottom: 14,
    right: 12,
    zIndex: 20,
  },
  bottomCenter: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -35,
    zIndex: 20,
  },
  killFeedContainer: {
    position: 'absolute',
    top: 50,
    right: 14,
    width: 180,
    zIndex: 15,
  },
});
