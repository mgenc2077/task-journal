import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { migrateDbIfNeeded } from '@/db/schema';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SQLiteProvider databaseName="taskjournal.db" onInit={migrateDbIfNeeded}>
        <ThemeProvider value={theme}>
          <AnimatedSplashOverlay />
          <Stack screenOptions={{ animation: 'none' }}>
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
                animation: 'none',
              }}
            />
            <Stack.Screen
              name="task/[date]"
              options={{
                headerTitle: 'Tasks',
                animation: 'none',
              }}
            />
          </Stack>
        </ThemeProvider>
      </SQLiteProvider>
    </View>
  );
}
