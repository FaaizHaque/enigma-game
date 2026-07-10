/**
 * Sounds — plays bundled WAV files via expo-av.
 *
 * Files live in assets/sounds/ and are preloaded once so triggers are instant.
 * (Previously these were synthesized in JS at runtime via btoa + filesystem,
 * which fails silently on device — btoa isn't reliable in React Native.)
 */
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FILES = {
  question: require('../../assets/sounds/question.wav'),
  yes: require('../../assets/sounds/yes.wav'),
  no: require('../../assets/sounds/no.wav'),
  partly: require('../../assets/sounds/partly.wav'),
  solve: require('../../assets/sounds/solve.wav'),
  win: require('../../assets/sounds/win.wav'),
  lose: require('../../assets/sounds/lose.wav'),
  hint: require('../../assets/sounds/hint.wav'),
  coin: require('../../assets/sounds/coin.wav'),
  hostWin: require('../../assets/sounds/hostWin.wav'),
  eliminated: require('../../assets/sounds/eliminated.wav'),
};

let audioReady = false;
let muted = false;
const loaded = {};
const MUTE_KEY = 'enigma_muted_v1';

export async function initAudio() {
  if (audioReady) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false, // respect the phone's silent/mute switch
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    for (const [name, mod] of Object.entries(FILES)) {
      try {
        const { sound } = await Audio.Sound.createAsync(mod, { shouldPlay: false, volume: 0.7 });
        loaded[name] = sound;
      } catch {}
    }
    audioReady = true;
  } catch (e) {
    console.warn('Audio init failed:', e);
  }
}

// Load the saved mute preference (call once on mount). Returns the value.
export async function loadMuted() {
  try { muted = (await AsyncStorage.getItem(MUTE_KEY)) === '1'; } catch {}
  return muted;
}
export function isMuted() { return muted; }
export async function setMuted(m) {
  muted = !!m;
  try { await AsyncStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch {}
  return muted;
}

async function playSound(name) {
  if (!audioReady || muted) return;
  const s = loaded[name];
  if (!s) return;
  try { await s.replayAsync(); } catch {}
}

export const sounds = {
  question: () => playSound('question'),
  yes: () => playSound('yes'),
  no: () => playSound('no'),
  partly: () => playSound('partly'),
  solve: () => playSound('solve'),
  win: () => playSound('win'),
  lose: () => playSound('lose'),
  hint: () => playSound('hint'),
  coin: () => playSound('coin'),
  hostWin: () => playSound('hostWin'),
  eliminated: () => playSound('eliminated'),
};
