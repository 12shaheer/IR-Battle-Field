import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'dropzone_session_id';
const PLAYER_KEY = 'dropzone_player_id';

export const saveSession = async (sessionId, playerId) => {
  await AsyncStorage.setItem(SESSION_KEY, sessionId);
  await AsyncStorage.setItem(PLAYER_KEY, playerId);
};

export const getSession = async () => {
  const sessionId = await AsyncStorage.getItem(SESSION_KEY);
  const playerId = await AsyncStorage.getItem(PLAYER_KEY);
  return { sessionId, playerId };
};

export const clearSession = async () => {
  await AsyncStorage.removeItem(SESSION_KEY);
  await AsyncStorage.removeItem(PLAYER_KEY);
};
