import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  useFonts,
  Baloo2_400Regular,
  Baloo2_600SemiBold,
  Baloo2_800ExtraBold,
} from '@expo-google-fonts/baloo-2';
import * as SplashScreen from 'expo-splash-screen';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Baloo2_400Regular,
    Baloo2_600SemiBold,
    Baloo2_800ExtraBold,
  });
  const [authReady, setAuthReady] = useState(false);
  const roteador = useRouter();

  useEffect(() => {
    if (!fontsLoaded) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthReady(true);
      SplashScreen.hideAsync();
      if (user) {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const espacoAtivo = snap.data()?.espacoAtivo;
        if (espacoAtivo) {
          roteador.replace('/(tabs)');
        } else {
          roteador.replace('/espacos');
        }
      } else {
        roteador.replace('/');
      }
    });
    return unsub;
  }, [fontsLoaded]);

  if (!fontsLoaded || !authReady) {
    return <View style={{ flex: 1, backgroundColor: '#fff8f9' }} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
