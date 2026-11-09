import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useReducedMotion } from '../components/PregameMotion';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import StartScreen from '../screens/StartScreen';
import MainMenuScreen from '../screens/MainMenuScreen';
import ModeSelectScreen from '../screens/ModeSelectScreen';
import JoinScreen from '../screens/JoinScreen';
import TeamPartyScreen from '../screens/TeamPartyScreen';
import GunPairScreen from '../screens/GunPairScreen';
import LobbyScreen from '../screens/LobbyScreen';
import GameHUD from '../screens/GameHUD';
import EliminatedScreen from '../screens/EliminatedScreen';
import ResultsScreen from '../screens/ResultsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const reducedMotion = useReducedMotion();
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="MainMenu"
        screenOptions={{
          headerShown: false,
          animation: reducedMotion ? 'none' : 'slide_from_right',
          animationDuration: 360,
          gestureEnabled: false,
        }}
      >
        <Stack.Screen name="Start" component={StartScreen} />
        <Stack.Screen name="MainMenu" component={MainMenuScreen} />
        <Stack.Screen name="ModeSelect" component={ModeSelectScreen} />
        <Stack.Screen name="TeamParty" component={TeamPartyScreen} />
        <Stack.Screen name="Join" component={JoinScreen} />
        <Stack.Screen name="GunPair" component={GunPairScreen} />
        <Stack.Screen name="Lobby" component={LobbyScreen} />
        <Stack.Screen name="GameHUD" component={GameHUD} />
        <Stack.Screen name="Eliminated" component={EliminatedScreen} />
        <Stack.Screen name="Results" component={ResultsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
