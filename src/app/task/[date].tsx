import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TaskForm } from '@/components/task/task-form';
import { TaskItem } from '@/components/task/task-item';
import { Spacing } from '@/constants/theme';
import {
  createTask,
  deleteTask,
  getTasksByDate,
  updateTask,
} from '@/db/tasks';
import type { Task } from '@/types/task';

type EditingState =
  | { mode: 'none' }
  | { mode: 'create' }
  | { mode: 'edit'; task: Task };

function formatDateHeading(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TaskDateScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const db = useSQLiteContext();
  const navigation = useNavigation();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [editing, setEditing] = useState<EditingState>({ mode: 'none' });

  useEffect(() => {
    navigation.setOptions({ headerTitle: date ? formatDateHeading(date) : 'Tasks' });
  }, [navigation, date]);

  useEffect(() => {
    async function load() {
      if (!date) return;
      const result = await getTasksByDate(db, date);
      setTasks(result);
    }
    load();
  }, [db, date]);

  async function refreshTasks() {
    if (!date) return;
    const result = await getTasksByDate(db, date);
    setTasks(result);
  }

  function handleAdd() {
    setEditing({ mode: 'create' });
  }

  function handleEdit(task: Task) {
    setEditing({ mode: 'edit', task });
  }

  async function handleSave(data: { title: string; notes: string }) {
    if (editing.mode === 'create') {
      await createTask(db, { date: date!, ...data });
    } else if (editing.mode === 'edit') {
      await updateTask(db, editing.task.id, data);
    }
    setEditing({ mode: 'none' });
    refreshTasks();
  }

  function handleCancel() {
    setEditing({ mode: 'none' });
  }

  async function handleDelete(task: Task) {
    await deleteTask(db, task.id);
    refreshTasks();
  }

  if (!date) return null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {editing.mode !== 'none' ? (
          <ThemedView style={styles.formSection}>
            <TaskForm
              initialTitle={editing.mode === 'edit' ? editing.task.title : ''}
              initialNotes={editing.mode === 'edit' ? editing.task.notes : ''}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </ThemedView>
        ) : (
          <>
            {tasks.length === 0 ? (
              <ThemedView style={styles.emptyState}>
                <ThemedText themeColor="textSecondary">
                  No tasks for this day.
                </ThemedText>
              </ThemedView>
            ) : (
              <ThemedView style={styles.taskList}>
                {tasks.map((task) => (
                  <ThemedView key={task.id} style={styles.taskRow}>
                    <ThemedView style={styles.taskContent}>
                      <TaskItem task={task} onPress={handleEdit} />
                    </ThemedView>
                    <Pressable
                      onPress={() => handleDelete(task)}
                      hitSlop={8}
                      style={styles.deleteButton}
                    >
                      <ThemedText type="small" style={styles.deleteText}>
                        Delete
                      </ThemedText>
                    </Pressable>
                  </ThemedView>
                ))}
              </ThemedView>
            )}
            <Pressable onPress={handleAdd} style={styles.fab}>
              <ThemedText style={styles.fabText}>+</ThemedText>
            </Pressable>
          </>
        )}
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
  },
  formSection: {
    paddingTop: Spacing.two,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskList: {
    gap: Spacing.two,
    paddingBottom: 80,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  taskContent: {
    flex: 1,
  },
  deleteButton: {
    padding: Spacing.two,
  },
  deleteText: {
    color: '#ff3b30',
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.five,
    right: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3c87f7',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
});
