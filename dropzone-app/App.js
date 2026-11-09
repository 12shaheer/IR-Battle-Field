import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { GameProvider } from './src/context/GameContext';
import AppNavigator from './src/navigation/AppNavigator';
import { requestAllPermissions, enableServices } from './src/utils/permissions';

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

    async function initPermissions() {
      await requestAllPermissions();
      await enableServices();
    }
    initPermissions();
  }, []);

  return (
    <SafeAreaProvider>
    <GameProvider>
      <StatusBar style="light" hidden />
      <AppNavigator />
    </GameProvider>
    </SafeAreaProvider>
  );
}
