import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'dropzone_session_id';
const PLAYER_KEY = 'dropzone_player_id';
const USER_KEY = 'dropzone_user';
const USERNAME_KEY = 'dropzone_username';
let usernameWrite = Promise.resolve();

export const saveSession = async (sessionId, playerId) => {
  await AsyncStorage.setItem(SESSION_KEY, sessionId);
  await AsyncStorage.setItem(PLAYER_KEY, playerId);
};
export const getSession = async () => ({
  sessionId: await AsyncStorage.getItem(SESSION_KEY),
  playerId: await AsyncStorage.getItem(PLAYER_KEY),
});
export const clearSession = async () => {
  await AsyncStorage.removeItem(SESSION_KEY);
  await AsyncStorage.removeItem(PLAYER_KEY);
};

// First completed username wins. Serialize competing writes and retain the
// identity separately from editable profile details and match sessions.
export const lockUsername = (name) => {
  const operation = usernameWrite.then(async () => {
    const locked = await AsyncStorage.getItem(USERNAME_KEY);
    if (locked) return locked;
    const raw = await AsyncStorage.getItem(USER_KEY);
    const legacyName = raw ? JSON.parse(raw)?.name?.trim() : '';
    const canonical = legacyName || (name || '').trim();
    if (canonical.length < 2 || canonical.length > 20) throw new Error('Username must be 2–20 characters.');
    await AsyncStorage.setItem(USERNAME_KEY, canonical);
    return canonical;
  });
  usernameWrite = operation.catch(() => {});
  return operation;
};
export const saveUser = async (user) => {
  const name = await lockUsername(user.name);
  const previous = await AsyncStorage.getItem(USER_KEY);
  const saved = { ...(previous ? JSON.parse(previous) : {}), ...user, name, usernameLocked: true };
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(saved));
  return saved;
};
export const getUser = async () => {
  const raw = await AsyncStorage.getItem(USER_KEY);
  const profile = raw ? JSON.parse(raw) : null;
  let name = await AsyncStorage.getItem(USERNAME_KEY);
  if (!name && profile?.name) name = await lockUsername(profile.name);
  return name ? { ...profile, name, usernameLocked: true } : profile;
};
export const clearUser = async () => {
  // Clearing profile details must not unlock an already chosen username.
  await AsyncStorage.removeItem(USER_KEY);
};
