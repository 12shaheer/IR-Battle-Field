import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { bleManager } from '../game/ble';

export async function requestAllPermissions() {
  const results = { camera: false, location: false, bluetooth: false };

  try {
    const { status: camStatus } = await Camera.requestCameraPermissionsAsync();
    results.camera = camStatus === 'granted';
  } catch (e) {
    console.warn('[Permissions] Camera request failed:', e.message);
  }

  try {
    const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
    results.location = locStatus === 'granted';
  } catch (e) {
    console.warn('[Permissions] Location request failed:', e.message);
  }

  if (Platform.OS === 'android') {
    try {
      if (Platform.Version >= 31) {
        const bleResult = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        results.bluetooth = Object.values(bleResult).every(
          (v) => v === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const locResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        results.bluetooth = locResult === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (e) {
      console.warn('[Permissions] BLE permission request failed:', e.message);
    }
  } else {
    results.bluetooth = true;
  }

  console.log('[Permissions] Results:', results);
  return results;
}

export async function enableServices() {
  if (Platform.OS === 'android') {
    try {
      await bleManager.enable();
      console.log('[Services] Bluetooth enabled');
    } catch (e) {
      console.warn('[Services] Could not enable Bluetooth:', e.message);
    }
  }

  try {
    const locationEnabled = await Location.hasServicesEnabledAsync();
    if (!locationEnabled) {
      Alert.alert(
        'Location Services Required',
        'Please enable location services for Bluetooth scanning to work.',
        [
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
          { text: 'Later', style: 'cancel' },
        ]
      );
    }
  } catch (e) {
    console.warn('[Services] Location check failed:', e.message);
  }
}
