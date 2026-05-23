import { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Task } from '@/types/task';

interface TaskItemProps {
  task: Task;
  onPress: (task: Task) => void;
}

function TaskItemInner({ task, onPress }: TaskItemProps) {
  return (
    <Pressable
      onPress={() => onPress(task)}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText style={styles.title}>{task.title}</ThemedText>
        {task.notes.length > 0 && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {task.notes}
          </ThemedText>
        )}
      </ThemedView>
    </Pressable>
  );
}

export const TaskItem = memo(TaskItemInner);

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  title: {
    fontWeight: '600',
    fontSize: 16,
  },
});
