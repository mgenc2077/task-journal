import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarGrid } from '@/components/calendar/calendar-grid';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getDatesWithTasks } from '@/db/tasks';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function CalendarScreen() {
  const db = useSQLiteContext();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [taskDates, setTaskDates] = useState<Set<string>>(new Set());

  const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

  useEffect(() => {
    async function load() {
      const dates = await getDatesWithTasks(db, yearMonth);
      setTaskDates(new Set(dates));
    }
    load();
  }, [db, yearMonth]);

  function goToPrevMonth() {
    setMonth((m) => {
      if (m === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }

  function goToNextMonth() {
    setMonth((m) => {
      if (m === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }

  function handleDayPress(date: string) {
    router.push({ pathname: '/task/[date]', params: { date } });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.monthHeader}>
          <Pressable onPress={goToPrevMonth} hitSlop={12}>
            <ThemedText style={styles.arrow}>{'‹'}</ThemedText>
          </Pressable>
          <ThemedText type="subtitle">
            {MONTH_NAMES[month]} {year}
          </ThemedText>
          <Pressable onPress={goToNextMonth} hitSlop={12}>
            <ThemedText style={styles.arrow}>{'›'}</ThemedText>
          </Pressable>
        </ThemedView>
        <CalendarGrid
          year={year}
          month={month}
          taskDates={taskDates}
          onDayPress={handleDayPress}
        />
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
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 400,
    marginBottom: Spacing.three,
    paddingHorizontal: Spacing.one,
  },
  arrow: {
    fontSize: 28,
    fontWeight: '300',
    paddingHorizontal: Spacing.two,
  },
});
