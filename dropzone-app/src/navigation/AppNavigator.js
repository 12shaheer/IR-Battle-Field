import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import StartScreen from '../screens/StartScreen';
import MainMenuScreen from '../screens/MainMenuScreen';
import JoinScreen from '../screens/JoinScreen';
import GunPairScreen from '../screens/GunPairScreen';
import LobbyScreen from '../screens/LobbyScreen';
import GameHUD from '../screens/GameHUD';
import EliminatedScreen from '../screens/EliminatedScreen';
import ResultsScreen from '../screens/ResultsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Start"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          gestureEnabled: false,
        }}
      >
        <Stack.Screen name="Start" component={StartScreen} />
        <Stack.Screen name="MainMenu" component={MainMenuScreen} />
        <Stack.Screen name="Join" component={JoinScreen} />
        <Stack.Screen name="GunPair" component={GunPairScreen} />
        <Stack.Screen name="Lobby" component={LobbyScreen} />
        <Stack.Screen name="GameHUD" component={GameHUD} />
        <Stack.Screen name="Eliminated" component={EliminatedScreen} />
        <Stack.Screen name="Results" component={ResultsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
