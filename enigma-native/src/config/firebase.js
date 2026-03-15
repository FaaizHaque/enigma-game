/**
 * Firebase Configuration
 *
 * Fill in your Firebase project credentials here, or set them in app.json extra:
 *   "extra": {
 *     "firebaseApiKey": "...",
 *     "firebaseMessagingSenderId": "...",
 *     "firebaseAppId": "..."
 *   }
 *
 * You can find these values in your Firebase Console → Project Settings → Your apps.
 */
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};

export const firebaseConfig = {
  apiKey: extra.firebaseApiKey || '',
  authDomain: 'enigma-game-dc20c.firebaseapp.com',
  projectId: 'enigma-game-dc20c',
  storageBucket: 'enigma-game-dc20c.firebasestorage.app',
  messagingSenderId: extra.firebaseMessagingSenderId || '',
  appId: extra.firebaseAppId || '',
};
