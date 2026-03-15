/**
 * Sounds — synthesized audio via expo-av + expo-file-system
 *
 * Generates minimal WAV buffers in-memory and plays them via AVAudioPlayer.
 * Uses the cache directory to avoid repeated writes for the same tone.
 */
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

// ─── WAV buffer generator ─────────────────────────────────────────────────────
function buildWAV(sampleRate, samples) {
  const numSamples = samples.length;
  const byteLength = 44 + numSamples * 2;
  const bytes = new Uint8Array(byteLength);
  const view = new DataView(bytes.buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);   // PCM
  view.setUint16(22, 1, true);   // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-32768, Math.min(32767, Math.round(samples[i])));
    view.setInt16(44 + i * 2, clamped, true);
  }

  // Convert to base64
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function sineWave(freq, duration, sampleRate = 22050, amp = 0.4) {
  const n = Math.floor(sampleRate * duration);
  return Array.from({ length: n }, (_, i) => {
    const t = i / sampleRate;
    const env = Math.min(t * 40, 1) * Math.max(0, 1 - (t / duration - 0.7) * 3.3);
    return Math.sin(2 * Math.PI * freq * t) * env * amp * 32767;
  });
}

function sawWave(freq, duration, sampleRate = 22050, amp = 0.25) {
  const n = Math.floor(sampleRate * duration);
  return Array.from({ length: n }, (_, i) => {
    const t = i / sampleRate;
    const env = Math.max(0, 1 - t / duration);
    const phase = (t * freq) % 1;
    return (phase * 2 - 1) * env * amp * 32767;
  });
}

function triWave(freq, duration, sampleRate = 22050, amp = 0.35) {
  const n = Math.floor(sampleRate * duration);
  return Array.from({ length: n }, (_, i) => {
    const t = i / sampleRate;
    const env = Math.max(0, 1 - t / duration);
    const phase = (t * freq) % 1;
    return (Math.abs(phase * 4 - 2) - 1) * env * amp * 32767;
  });
}

function mixSamples(sampleRate, ...parts) {
  // parts: [{samples, offset}] where offset is in seconds
  const totalLen = parts.reduce((max, p) => {
    return Math.max(max, Math.floor(p.offset * sampleRate) + p.samples.length);
  }, 0);
  const out = new Array(totalLen).fill(0);
  for (const { samples, offset } of parts) {
    const start = Math.floor(offset * sampleRate);
    for (let i = 0; i < samples.length; i++) out[start + i] += samples[i];
  }
  // Normalize
  const peak = Math.max(...out.map(Math.abs));
  if (peak > 32767) out.forEach((_, i) => { out[i] = (out[i] / peak) * 32767; });
  return out;
}

// ─── Sound definitions ────────────────────────────────────────────────────────
const SOUND_DEFS = {
  question: () => buildWAV(22050, mixSamples(22050,
    { samples: sineWave(700, 0.12), offset: 0 },
    { samples: sineWave(1000, 0.12), offset: 0.09 }
  )),
  yes: () => buildWAV(22050, mixSamples(22050,
    { samples: sineWave(523, 0.22), offset: 0 },
    { samples: sineWave(659, 0.22), offset: 0.09 },
    { samples: sineWave(784, 0.25), offset: 0.18 }
  )),
  no: () => buildWAV(22050, sawWave(280, 0.28)),
  partly: () => buildWAV(22050, mixSamples(22050,
    { samples: triWave(440, 0.22), offset: 0 },
    { samples: triWave(554, 0.24), offset: 0.12 }
  )),
  solve: () => buildWAV(22050, mixSamples(22050,
    { samples: sineWave(380, 0.18), offset: 0 },
    { samples: sineWave(480, 0.18), offset: 0.07 },
    { samples: sineWave(600, 0.18), offset: 0.14 },
    { samples: sineWave(760, 0.22), offset: 0.21 }
  )),
  win: () => buildWAV(22050, mixSamples(22050,
    { samples: sineWave(523, 0.35), offset: 0 },
    { samples: sineWave(659, 0.35), offset: 0.1 },
    { samples: sineWave(784, 0.35), offset: 0.2 },
    { samples: sineWave(1047, 0.45), offset: 0.34 }
  )),
  hostWin: () => buildWAV(22050, mixSamples(22050,
    { samples: triWave(220, 0.45), offset: 0 },
    { samples: triWave(277, 0.45), offset: 0.16 },
    { samples: triWave(330, 0.5), offset: 0.32 }
  )),
  eliminated: () => buildWAV(22050, mixSamples(22050,
    { samples: triWave(440, 0.15), offset: 0 },
    { samples: triWave(330, 0.15), offset: 0.15 },
    { samples: triWave(220, 0.25), offset: 0.3 }
  )),
};

// ─── Sound player ─────────────────────────────────────────────────────────────
let audioReady = false;
const uriCache = {};

export async function initAudio() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
    audioReady = true;
  } catch (e) {
    console.warn('Audio init failed:', e);
  }
}

async function playSound(name) {
  if (!audioReady) return;
  try {
    if (!uriCache[name]) {
      const base64 = SOUND_DEFS[name]();
      const uri = FileSystem.cacheDirectory + `enigma_${name}.wav`;
      await FileSystem.writeAsStringAsync(uri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      uriCache[name] = uri;
    }
    const { sound } = await Audio.Sound.createAsync({ uri: uriCache[name] });
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((s) => {
      if (s.didJustFinish) sound.unloadAsync().catch(() => {});
    });
  } catch (e) {
    // Silent fail — audio is non-critical
  }
}

export const sounds = {
  question: () => playSound('question'),
  yes: () => playSound('yes'),
  no: () => playSound('no'),
  partly: () => playSound('partly'),
  solve: () => playSound('solve'),
  win: () => playSound('win'),
  hostWin: () => playSound('hostWin'),
  eliminated: () => playSound('eliminated'),
};
