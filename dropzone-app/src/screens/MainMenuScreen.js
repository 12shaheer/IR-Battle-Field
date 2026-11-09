import React, { useState, useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUser } from '../utils/storage';
import PlayerBadge from '../components/PlayerBadge';
import PlayPanel from '../components/PlayPanel';
import HomeAtmosphere from '../components/HomeAtmosphere';
import { MotionEntrance, CinematicBackdrop } from '../components/PregameMotion';

export default function MainMenuScreen({ navigation }) {
  const [userProfile, setUserProfile] = useState(null);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  useFocusEffect(useCallback(() => {
    let active = true;
    getUser().then(user => { if (active) setUserProfile(user); }).catch(error => console.warn('[Profile]', error.message));
    return () => { active = false; };
  }, []));
  const panelWidth = Math.min(360, width * 0.39);
  return <View style={styles.container}>
    <CinematicBackdrop hero source={require('../../assets/Main Menu background image.jpeg')} />
    <HomeAtmosphere />
    <MotionEntrance delay={100} style={[styles.profile, { top: Math.max(18, insets.top + 10), left: Math.max(24, insets.left + 14) }]}>
      <PlayerBadge username={userProfile?.name} userId={userProfile?.userId} gender={userProfile?.gender} avatarUri={userProfile?.avatarUri} onPress={() => navigation.navigate('Profile')} />
    </MotionEntrance>
    <MotionEntrance delay={250} style={[styles.playPanel, { bottom: Math.max(22, insets.bottom + 14), right: Math.max(24, insets.right + 16) }]}>
      <PlayPanel width={panelWidth} onPress={() => navigation.navigate('ModeSelect')} />
    </MotionEntrance>
  </View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#260655' },
  profile: { position: 'absolute' },
  playPanel: { position: 'absolute' },
});
