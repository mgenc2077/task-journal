import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <Tabs
      screenOptions={{
        animation: 'none',
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.backgroundElement,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{
                ios: 'calendar',
                android: 'calendar_today',
              }}
              size={size}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="all-tasks"
        options={{
          title: 'All Tasks',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{
                ios: 'list.bullet',
                android: 'list',
              }}
              size={size}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="repeated-tasks"
        options={{
          title: 'Repeat',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{
                ios: 'arrow.triangle.2.circlepath',
                android: 'repeat',
              }}
              size={size}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{
                ios: 'gearshape',
                android: 'settings',
              }}
              size={size}
              tintColor={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
