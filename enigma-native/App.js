import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Cinzel_400Regular,
  Cinzel_600SemiBold,
  Cinzel_700Bold,
  Cinzel_900Black,
} from '@expo-google-fonts/cinzel';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import EnigmaGame from './src/EnigmaGame';
import { initAudio } from './src/utils/sounds';

// Keep the native splash visible until EnigmaGame paints its first frame —
// this eliminates the black gap. EnigmaGame calls SplashScreen.hideAsync()
// from its splash <View onLayout>.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  // Load fonts in the background, but don't gate rendering on them.
  // The splash screen uses only an <Image>, so it doesn't need fonts.
  useFonts({
    Cinzel_400Regular,
    Cinzel_600SemiBold,
    Cinzel_700Bold,
    Cinzel_900Black,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => { initAudio(); }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#06060f" />
      <EnigmaGame />
    </SafeAreaProvider>
  );
}
