import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TaskItem } from '@/components/task/task-item';
import { Spacing } from '@/constants/theme';
import { getAllTasksGrouped } from '@/db/tasks';
import type { Task } from '@/types/task';

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function AllTasksScreen() {
  const db = useSQLiteContext();
  const [groups, setGroups] = useState<{ date: string; tasks: Task[] }[]>([]);

  useEffect(() => {
    async function load() {
      const result = await getAllTasksGrouped(db);
      setGroups(result);
    }
    load();
  }, [db]);

  const handleDatePress = useCallback((date: string) => {
    router.push({ pathname: '/task/[date]', params: { date } });
  }, []);

  const handleTaskPress = useCallback((task: Task) => {
    router.push({ pathname: '/task/[date]', params: { date: task.date } });
  }, []);

  if (groups.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.center}>
          <ThemedText themeColor="textSecondary">No tasks yet.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {groups.map((group) => (
          <ThemedView key={group.date} style={styles.dateGroup}>
            <Pressable onPress={() => handleDatePress(group.date)}>
              <ThemedText
                type="smallBold"
                themeColor="textSecondary"
                style={styles.dateHeader}
              >
                {formatDateLabel(group.date)}
              </ThemedText>
            </Pressable>
            {group.tasks.map((task) => (
              <TaskItem key={task.id} task={task} onPress={handleTaskPress} />
            ))}
          </ThemedView>
        ))}
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
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateGroup: {
    gap: Spacing.two,
  },
  dateHeader: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
});
