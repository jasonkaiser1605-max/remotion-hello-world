import { DarkTheme, router, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSyncExternalStore } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useApp } from '@/store';
import { C } from '@/theme';

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, text: C.text, border: C.border, primary: C.accent },
};

function Done() {
  return (
    <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={10}>
      <Text style={{ color: C.accent, fontWeight: '700', fontSize: 16 }}>Done</Text>
    </Pressable>
  );
}

export default function RootLayout() {
  // Wait until saved data has loaded from storage before deciding on onboarding.
  const hydrated = useSyncExternalStore(
    (onChange) => useApp.persist.onFinishHydration(onChange),
    () => useApp.persist.hasHydrated(),
    () => false,
  );

  if (!hydrated) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: C.bg },
            headerTintColor: C.text,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: C.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="workout/[id]" options={{ title: 'Workout', presentation: 'modal' }} />
          <Stack.Screen name="food/add" options={{ title: 'Log food', presentation: 'modal', headerRight: () => <Done /> }} />
          <Stack.Screen name="settings" options={{ title: 'Settings', presentation: 'modal', headerRight: () => <Done /> }} />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
