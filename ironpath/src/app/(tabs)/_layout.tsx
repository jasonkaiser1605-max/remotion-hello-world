import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useApp } from '@/store';
import { C } from '@/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Today', icon: 'lightning-bolt' },
  { name: 'plan', title: 'Plan', icon: 'calendar-month' },
  { name: 'fuel', title: 'Fuel', icon: 'food-apple' },
  { name: 'recovery', title: 'Recovery', icon: 'heart-pulse' },
  { name: 'learn', title: 'Learn', icon: 'book-open-variant' },
];

export default function TabsLayout() {
  const onboarded = useApp((s) => s.onboarded);
  const healthConnected = useApp((s) => s.healthConnected);
  const sync = useApp((s) => s.sync);

  // Pull fresh Garmin / Apple Watch data whenever the app comes to the foreground.
  useEffect(() => {
    if (!onboarded || !healthConnected) return;
    void sync();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });
    return () => sub.remove();
  }, [onboarded, healthConnected, sync]);

  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.faint,
        tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.border },
        tabBarLabelStyle: { fontWeight: '600' },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name={t.icon} color={color as string} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
