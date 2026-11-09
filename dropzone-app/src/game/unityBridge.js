import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
const native = Platform.OS === 'android' ? NativeModules.DropZoneUnity : null;
export const unityAvailable = !!native;
export function launchUnity(state) { return native ? native.launch(JSON.stringify(state)) : Promise.reject(new Error('Unity native library is not installed')); }
export function updateUnity(state) { native?.updateState(JSON.stringify(state)); }
export function presentUnity(method, value = '') { native?.send(method, String(value)); }
export function onUnityEvent(callback) {
  if (!native) return () => {};
  const subscription = new NativeEventEmitter(native).addListener('DropZoneUnityEvent', callback);
  return () => subscription.remove();
}
