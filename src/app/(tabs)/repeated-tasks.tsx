import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CategoryPicker } from '@/components/task/category-picker';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  createCategory,
  deleteCategory,
  getCategories,
} from '@/db/categories';
import {
  createRepeatedTask,
  deleteRepeatedTask,
  getRepeatedTaskHistory,
  getRepeatedTaskLastUsed,
  getRepeatedTasks,
  updateRepeatedTask,
} from '@/db/repeated-tasks';
import type { Category } from '@/types/category';
import type { RepeatedTask } from '@/types/repeated-task';
import type { Task } from '@/types/task';

type OverlayState =
  | { mode: 'none' }
  | { mode: 'create' }
  | { mode: 'edit'; task: RepeatedTask }
  | { mode: 'history'; task: RepeatedTask; history: Task[] };

function formatDaysAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never logged';
  const [y, m, d] = dateStr.split('-').map(Number);
  const last = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  last.setHours(0, 0, 0, 0);
  const diffMs = now.getTime() - last.getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function RepeatedTasksScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();

  const [tasks, setTasks] = useState<RepeatedTask[]>([]);
  const [lastUsedMap, setLastUsedMap] = useState<Record<string, string | null>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [overlay, setOverlay] = useState<OverlayState>({ mode: 'none' });

  const [formTitle, setFormTitle] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formCategoryId, setFormCategoryId] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  async function loadData() {
    const [all, cats] = await Promise.all([
      getRepeatedTasks(db),
      getCategories(db),
    ]);
    setTasks(all);
    setCategories(cats);
    const catMap: Record<string, string> = {};
    for (const c of cats) {
      catMap[c.id] = c.name;
    }
    setCategoryMap(catMap);
    const map: Record<string, string | null> = {};
    for (const t of all) {
      map[t.title] = await getRepeatedTaskLastUsed(db, t.title);
    }
    setLastUsedMap(map);
  }

  useFocusEffect(() => {
    async function load() {
      await loadData();
    }
    load();
  });

  function startCreate() {
    setFormTitle('');
    setFormNotes('');
    setFormCategoryId(null);
    setShowCategoryPicker(false);
    setOverlay({ mode: 'create' });
  }

  function startEdit(task: RepeatedTask) {
    setFormTitle(task.title);
    setFormNotes(task.default_notes);
    setFormCategoryId(task.category_id);
    setShowCategoryPicker(false);
    setOverlay({ mode: 'edit', task });
  }

  async function openHistory(task: RepeatedTask) {
    const history = await getRepeatedTaskHistory(db, task.title);
    setOverlay({ mode: 'history', task, history });
  }

  async function handleFormSave() {
    const trimmed = formTitle.trim();
    if (trimmed.length === 0) return;
    if (overlay.mode === 'create') {
      await createRepeatedTask(db, {
        title: trimmed,
        default_notes: formNotes.trim(),
        category_id: formCategoryId,
      });
    } else if (overlay.mode === 'edit') {
      await updateRepeatedTask(db, overlay.task.id, {
        title: trimmed,
        default_notes: formNotes.trim(),
        category_id: formCategoryId,
      });
    }
    setOverlay({ mode: 'none' });
    await loadData();
  }

  async function handleDelete(task: RepeatedTask) {
    await deleteRepeatedTask(db, task.id);
    setOverlay({ mode: 'none' });
    await loadData();
  }

  async function handleAddCategory(name: string) {
    await createCategory(db, { name });
    const cats = await getCategories(db);
    setCategories(cats);
    const catMap: Record<string, string> = {};
    for (const c of cats) {
      catMap[c.id] = c.name;
    }
    setCategoryMap(catMap);
  }

  async function handleDeleteCategory(id: string) {
    await deleteCategory(db, id);
    if (formCategoryId === id) {
      setFormCategoryId(null);
    }
    const cats = await getCategories(db);
    setCategories(cats);
    const catMap: Record<string, string> = {};
    for (const c of cats) {
      catMap[c.id] = c.name;
    }
    setCategoryMap(catMap);
  }

  function closeOverlay() {
    setOverlay({ mode: 'none' });
  }

  function getCategoryName(task: RepeatedTask): string | null {
    if (task.category_id == null) return null;
    return categoryMap[task.category_id] ?? null;
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle" style={styles.heading}>
          Repeated Tasks
        </ThemedText>

        {tasks.length === 0 && overlay.mode === 'none' && (
          <ThemedView style={styles.center}>
            <ThemedText themeColor="textSecondary">No repeated tasks yet.</ThemedText>
          </ThemedView>
        )}

        <ScrollView showsVerticalScrollIndicator={false}>
          {tasks.map((task) => (
            <ThemedView key={task.id} style={styles.row}>
              <Pressable
                onPress={() => openHistory(task)}
                style={({ pressed }) => [styles.rowCard, pressed && styles.pressed]}
              >
                <ThemedView type="backgroundElement" style={styles.rowInner}>
                  <View style={styles.rowTop}>
                    <ThemedText style={styles.rowTitle}>{task.title}</ThemedText>
                    {getCategoryName(task) && (
                      <ThemedView type="backgroundSelected" style={styles.categoryBadge}>
                        <ThemedText type="small" style={styles.categoryBadgeText}>
                          {getCategoryName(task)}
                        </ThemedText>
                      </ThemedView>
                    )}
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatDaysAgo(lastUsedMap[task.title] ?? null)}
                  </ThemedText>
                </ThemedView>
              </Pressable>
              <Pressable
                onPress={() => startEdit(task)}
                hitSlop={8}
                style={styles.editBtn}
              >
                <ThemedText type="small" style={styles.editText}>Edit</ThemedText>
              </Pressable>
            </ThemedView>
          ))}
        </ScrollView>

        <Pressable onPress={startCreate} style={styles.fab}>
          <ThemedText style={styles.fabIcon}>+</ThemedText>
        </Pressable>

        {overlay.mode !== 'none' && !showCategoryPicker && (
          <ThemedView style={styles.overlay}>
            <SafeAreaView style={styles.overlayInner}>
              {overlay.mode === 'history' ? (
                <>
                  <View style={styles.historyHeader}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.overlayTitle}>
                        {overlay.task.title}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary" type="small">
                        History ({overlay.history.length} entries)
                      </ThemedText>
                    </View>
                    <Pressable onPress={closeOverlay} style={styles.headerBtn}>
                      <ThemedText type="link">Close</ThemedText>
                    </Pressable>
                  </View>

                  {overlay.history.length === 0 && (
                    <ThemedView style={styles.center}>
                      <ThemedText themeColor="textSecondary">No entries yet.</ThemedText>
                    </ThemedView>
                  )}

                  <ScrollView showsVerticalScrollIndicator={false}>
                    {overlay.history.map((entry) => (
                      <ThemedView key={entry.id} style={styles.historyRow}>
                        <ThemedText type="smallBold">{formatDateLabel(entry.date)}</ThemedText>
                        {entry.notes.length > 0 && (
                          <ThemedText type="small" themeColor="textSecondary" numberOfLines={3}>
                            {entry.notes}
                          </ThemedText>
                        )}
                      </ThemedView>
                    ))}
                  </ScrollView>
                </>
              ) : (
                <>
                  <View style={styles.formHeader}>
                    <ThemedText style={styles.overlayTitle}>
                      {overlay.mode === 'create' ? 'New Template' : 'Edit Template'}
                    </ThemedText>
                    <Pressable onPress={closeOverlay} style={styles.headerBtn}>
                      <ThemedText type="link">Cancel</ThemedText>
                    </Pressable>
                  </View>
                  <KeyboardAvoidingView behavior="padding" style={styles.formWrapper}>
                    <View style={styles.formFields}>
                      <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="Task title"
                        placeholderTextColor={theme.textSecondary}
                        value={formTitle}
                        onChangeText={setFormTitle}
                        autoFocus
                        returnKeyType="next"
                      />
                      <TextInput
                        style={[styles.input, styles.notesInput, { color: theme.text }]}
                        placeholder="Default notes (optional)"
                        placeholderTextColor={theme.textSecondary}
                        value={formNotes}
                        onChangeText={setFormNotes}
                        multiline
                      />
                      <Pressable
                        onPress={() => setShowCategoryPicker(true)}
                        style={styles.categoryRow}
                      >
                        <ThemedText themeColor="textSecondary" type="small">
                          Category:
                        </ThemedText>
                        <ThemedText type="small">
                          {formCategoryId != null
                            ? (categoryMap[formCategoryId] ?? 'None')
                            : 'None'}
                        </ThemedText>
                        <ThemedText themeColor="textSecondary" type="small">
                          {' ›'}
                        </ThemedText>
                      </Pressable>
                      <View style={styles.formActions}>
                        {overlay.mode === 'edit' && (
                          <Pressable
                            onPress={() => handleDelete(overlay.task)}
                            style={styles.deleteBtn}
                          >
                            <ThemedText type="small" style={styles.deleteText}>
                              Delete
                            </ThemedText>
                          </Pressable>
                        )}
                        <View style={{ flex: 1 }} />
                        <Pressable
                          onPress={handleFormSave}
                          style={styles.saveBtn}
                        >
                          <ThemedText style={styles.saveText}>Save</ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  </KeyboardAvoidingView>
                </>
              )}
            </SafeAreaView>
          </ThemedView>
        )}

        {showCategoryPicker && (
          <ThemedView style={styles.overlay}>
            <SafeAreaView style={styles.overlayInner}>
              <CategoryPicker
                categories={categories}
                selectedId={formCategoryId}
                onSelect={(id) => {
                  setFormCategoryId(id);
                  setShowCategoryPicker(false);
                }}
                onAddCategory={handleAddCategory}
                onDeleteCategory={handleDeleteCategory}
                onClose={() => setShowCategoryPicker(false)}
              />
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
    paddingTop: Spacing.two,
  },
  heading: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    gap: Spacing.one,
  },
  rowCard: {
    flex: 1,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  rowInner: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
  },
  categoryBadgeText: {
    fontSize: 12,
  },
  editBtn: {
    padding: Spacing.two,
  },
  editText: {
    color: '#3c87f7',
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.four,
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
  fabIcon: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
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
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.three,
  },
  headerBtn: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  historyRow: {
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
    gap: Spacing.half,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  formWrapper: {
    flex: 1,
  },
  formFields: {
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  input: {
    fontSize: 16,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: 'gray',
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: 'gray',
  },
  formActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  deleteBtn: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  deleteText: {
    color: '#ff3b30',
  },
  saveBtn: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    backgroundColor: '#3c87f7',
  },
  saveText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
