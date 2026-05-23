import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RepeatedTask } from '@/types/repeated-task';

interface RepeatedTaskPickerProps {
  tasks: RepeatedTask[];
  lastUsedMap: Record<string, string | null>;
  onSelect: (task: RepeatedTask) => void;
  onCancel: () => void;
}

function formatDaysAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
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

export function RepeatedTaskPicker({
  tasks,
  lastUsedMap,
  onSelect,
  onCancel,
}: RepeatedTaskPickerProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');

  const filtered = query.trim().length === 0
    ? tasks
    : tasks.filter((t) =>
        t.title.toLowerCase().includes(query.trim().toLowerCase()),
      );

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>Select a template</ThemedText>
        <Pressable onPress={onCancel} style={styles.cancelBtn}>
          <ThemedText type="link">Cancel</ThemedText>
        </Pressable>
      </ThemedView>
      <TextInput
        style={[styles.search, { color: theme.text, borderColor: theme.textSecondary }]}
        placeholder="Search templates..."
        placeholderTextColor={theme.textSecondary}
        value={query}
        onChangeText={setQuery}
        autoFocus
      />
      {filtered.length === 0 && (
        <ThemedView style={styles.empty}>
          <ThemedText themeColor="textSecondary" type="small">
            {query.trim().length > 0 ? 'No matches.' : 'No templates yet.'}
          </ThemedText>
        </ThemedView>
      )}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelect(item)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <ThemedView type="backgroundElement" style={styles.rowInner}>
              <ThemedText style={styles.rowTitle}>{item.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Last: {formatDaysAgo(lastUsedMap[item.title] ?? null)}
              </ThemedText>
            </ThemedView>
          </Pressable>
        )}
        contentContainerStyle={filtered.length === 0 ? undefined : styles.list}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  search: {
    fontSize: 16,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  rowInner: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.half,
  },
  rowTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
});
