import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarGrid } from '@/components/calendar/calendar-grid';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { RepeatedTaskPicker } from '@/components/task/repeated-task-picker';
import { TaskForm } from '@/components/task/task-form';
import { Spacing } from '@/constants/theme';
import { getRepeatedTaskLastUsed, getRepeatedTasks } from '@/db/repeated-tasks';
import { getSetting } from '@/db/settings';
import {
  createTask,
  deleteTask,
  getTasksByDate,
  getTasksByMonth,
  updateTask,
} from '@/db/tasks';
import type { RepeatedTask } from '@/types/repeated-task';
import type { Task } from '@/types/task';

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
  });
}

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CalendarScreen() {
  const db = useSQLiteContext();
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(getToday());
  const [tasksByDate, setTasksByDate] = useState<Record<string, Task[]>>({});
  const [dayTasks, setDayTasks] = useState<Task[]>([]);
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<'sunday' | 'monday'>('sunday');
  const [editing, setEditing] = useState<EditingState>({ mode: 'none' });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateNotes, setTemplateNotes] = useState('');
  const [formKey, setFormKey] = useState(0);
  const [repeatedTasks, setRepeatedTasks] = useState<RepeatedTask[]>([]);
  const [lastUsedMap, setLastUsedMap] = useState<Record<string, string | null>>({});
  const loadedTemplates = useRef(false);

  const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

  useEffect(() => {
    async function load() {
      const grouped = await getTasksByMonth(db, yearMonth);
      setTasksByDate(grouped);
    }
    load();
  }, [db, yearMonth]);

  useEffect(() => {
    async function load() {
      const result = await getTasksByDate(db, selectedDate);
      setDayTasks(result);
    }
    load();
  }, [db, selectedDate, tasksByDate]);

  useFocusEffect(() => {
    async function load() {
      const val = await getSetting(db, 'first_day_of_week', 'sunday');
      setFirstDayOfWeek(val as 'sunday' | 'monday');
      const grouped = await getTasksByMonth(db, yearMonth);
      setTasksByDate(grouped);
    }
    load();
  });

  useEffect(() => {
    if (editing.mode === 'create' && !loadedTemplates.current) {
      loadedTemplates.current = true;
      async function load() {
        const all = await getRepeatedTasks(db);
        setRepeatedTasks(all);
        const map: Record<string, string | null> = {};
        for (const t of all) {
          map[t.title] = await getRepeatedTaskLastUsed(db, t.title);
        }
        setLastUsedMap(map);
      }
      load();
    }
    if (editing.mode !== 'create') {
      loadedTemplates.current = false;
    }
  }, [db, editing.mode]);

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
    setSelectedDate(date);
    setEditing({ mode: 'none' });
  }

  function startCreate() {
    setTemplateTitle('');
    setTemplateNotes('');
    setFormKey((k) => k + 1);
    setPickerOpen(false);
    setEditing({ mode: 'create' });
  }

  function startEdit(task: Task) {
    setEditing({ mode: 'edit', task });
  }

  async function handleFormSave(data: { title: string; notes: string }) {
    if (editing.mode === 'create') {
      await createTask(db, { date: selectedDate, title: data.title, notes: data.notes });
    } else if (editing.mode === 'edit') {
      await updateTask(db, editing.task.id, data);
    }
    setEditing({ mode: 'none' });

    const grouped = await getTasksByMonth(db, yearMonth);
    setTasksByDate(grouped);
  }

  function cancelEdit() {
    setEditing({ mode: 'none' });
    setPickerOpen(false);
  }

  function handleTemplateSelect(task: RepeatedTask) {
    setTemplateTitle(task.title);
    setTemplateNotes(task.default_notes);
    setFormKey((k) => k + 1);
    setPickerOpen(false);
  }

  async function handleDelete(task: Task) {
    await deleteTask(db, task.id);
    const grouped = await getTasksByMonth(db, yearMonth);
    setTasksByDate(grouped);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false}>
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
            selectedDate={selectedDate}
            tasksByDate={tasksByDate}
            firstDayOfWeek={firstDayOfWeek}
            onDayPress={handleDayPress}
          />

          <ThemedView style={styles.daySection}>
            <ThemedText style={styles.dateHeading}>
              {formatDateHeading(selectedDate)}
            </ThemedText>

            <Pressable onPress={startCreate} style={styles.addRow}>
              <ThemedText style={styles.addIcon}>+</ThemedText>
              <ThemedText themeColor="textSecondary">Add a task...</ThemedText>
            </Pressable>

            {dayTasks.map((task) => (
              <ThemedView key={task.id} style={styles.taskRow}>
                <Pressable
                  onPress={() => startEdit(task)}
                  style={({ pressed }) => [styles.taskCard, pressed && styles.pressed]}
                >
                  <ThemedView type="backgroundElement" style={styles.taskCardInner}>
                    <ThemedText style={styles.taskTitle}>{task.title}</ThemedText>
                    {task.notes.length > 0 && (
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                        {task.notes}
                      </ThemedText>
                    )}
                  </ThemedView>
                </Pressable>
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

            {dayTasks.length === 0 && (
              <ThemedView style={styles.emptyState}>
                <ThemedText themeColor="textSecondary" type="small">
                  No tasks for this day.
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        </ScrollView>

        {editing.mode !== 'none' && (
          <ThemedView style={styles.overlay}>
            <SafeAreaView style={styles.overlayInner}>
              {pickerOpen && editing.mode === 'create' ? (
                <RepeatedTaskPicker
                  tasks={repeatedTasks}
                  lastUsedMap={lastUsedMap}
                  onSelect={handleTemplateSelect}
                  onCancel={() => setPickerOpen(false)}
                />
              ) : (
                <>
                  <ThemedText style={styles.overlayTitle}>
                    {editing.mode === 'create' ? 'New Task' : 'Edit Task'}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.overlayDate}>
                    {formatDateHeading(selectedDate)}
                  </ThemedText>
                  {editing.mode === 'create' && repeatedTasks.length > 0 && (
                    <Pressable
                      onPress={() => setPickerOpen(true)}
                      style={styles.templateRow}
                    >
                      <ThemedText themeColor="textSecondary">
                        Use repeated task...
                      </ThemedText>
                    </Pressable>
                  )}
                  <KeyboardAvoidingView behavior="padding" style={styles.formWrapper}>
                    <TaskForm
                      key={formKey}
                      initialTitle={editing.mode === 'edit' ? editing.task.title : templateTitle}
                      initialNotes={editing.mode === 'edit' ? editing.task.notes : templateNotes}
                      onSave={handleFormSave}
                      onCancel={cancelEdit}
                    />
                  </KeyboardAvoidingView>
                </>
              )}
            </SafeAreaView>
          </ThemedView>
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
    paddingTop: Spacing.three,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  arrow: {
    fontSize: 28,
    fontWeight: '300',
    paddingHorizontal: Spacing.two,
  },
  daySection: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.two,
  },
  dateHeading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.one,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  addIcon: {
    fontSize: 20,
    fontWeight: '300',
    width: 24,
    textAlign: 'center',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  taskCard: {
    flex: 1,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  taskCardInner: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  taskTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
  deleteButton: {
    padding: Spacing.two,
  },
  deleteText: {
    color: '#ff3b30',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  overlayInner: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  overlayTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: Spacing.one,
  },
  overlayDate: {
    marginBottom: Spacing.three,
  },
  templateRow: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: 'gray',
    borderStyle: 'dashed',
    marginBottom: Spacing.two,
  },
  formWrapper: {
    flex: 1,
  },
});
