import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getSetting, setSetting } from '@/db/settings';

type FirstDay = 'sunday' | 'monday';

const OPTIONS: { value: FirstDay; label: string }[] = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
];

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [firstDay, setFirstDay] = useState<FirstDay>('sunday');

  useEffect(() => {
    async function load() {
      const val = await getSetting(db, 'first_day_of_week', 'sunday');
      setFirstDay(val as FirstDay);
    }
    load();
  }, [db]);

  async function handleChange(value: FirstDay) {
    setFirstDay(value);
    await setSetting(db, 'first_day_of_week', value);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle" style={styles.heading}>
          Settings
        </ThemedText>
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>First day of the week</ThemedText>
          {OPTIONS.map((option) => {
            const active = firstDay === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => handleChange(option.value)}
                style={[styles.optionRow, active && styles.optionRowActive]}
              >
                <ThemedText style={styles.optionLabel}>{option.label}</ThemedText>
                {active && (
                  <ThemedText style={styles.checkmark}>✓</ThemedText>
                )}
              </Pressable>
            );
          })}
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  heading: {
    marginBottom: Spacing.four,
  },
  section: {
    gap: Spacing.one,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: Spacing.two,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  optionRowActive: {
    paddingHorizontal: Spacing.three,
  },
  optionLabel: {
    fontSize: 16,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '600',
  },
});
