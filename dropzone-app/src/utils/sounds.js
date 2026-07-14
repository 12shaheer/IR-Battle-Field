import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const players = {
  gunshot: null,
  hit: null,
  lowhealth: null,
  zoneWarning: null,
};

let loaded = false;

export const loadSounds = async () => {
  if (loaded) return;
  try {
    // Play even if the phone's ringer is on silent.
    await setAudioModeAsync({ playsInSilentMode: true });

    players.gunshot = createAudioPlayer(require('../assets/sounds/gunshot.mp3'));
    players.hit = createAudioPlayer(require('../assets/sounds/hit.mp3'));
    players.lowhealth = createAudioPlayer(require('../assets/sounds/lowhealth.mp3'));
    players.zoneWarning = createAudioPlayer(require('../assets/sounds/zone_warning.mp3'));

    loaded = true;
  } catch (e) {
    // Sounds are optional — game works without them
  }
};

export const playSound = (name) => {
  try {
    const player = players[name];
    if (player) {
      player.seekTo(0);
      player.play();
    }
  } catch (e) {
    // Silent fail — audio is non-critical
  }
};

export const unloadSounds = () => {
  for (const player of Object.values(players)) {
    try {
      if (player) player.remove();
    } catch (e) {}
  }
  loaded = false;
};
