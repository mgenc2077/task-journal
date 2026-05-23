import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Category } from '@/types/category';

interface CategoryPickerProps {
  categories: Category[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onAddCategory: (name: string) => void;
  onDeleteCategory: (id: number) => void;
  onClose: () => void;
}

export function CategoryPicker({
  categories,
  selectedId,
  onSelect,
  onAddCategory,
  onDeleteCategory,
  onClose,
}: CategoryPickerProps) {
  const theme = useTheme();
  const [newName, setNewName] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  function handleAdd() {
    const trimmed = newName.trim();
    if (trimmed.length === 0) return;
    onAddCategory(trimmed);
    setNewName('');
    setShowAdd(false);
  }

  function confirmDelete(cat: Category) {
    Alert.alert(
      'Delete Category',
      `Remove "${cat.name}"? Tasks in this category will become uncategorized.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteCategory(cat.id),
        },
      ],
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>Select Category</ThemedText>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <ThemedText type="link">Done</ThemedText>
        </Pressable>
      </ThemedView>

      <Pressable
        onPress={() => onSelect(null)}
        style={[styles.row, selectedId === null && styles.selectedRow]}
      >
        <ThemedText
          style={selectedId === null ? styles.selectedText : styles.rowText}
        >
          No category
        </ThemedText>
        {selectedId === null && (
          <ThemedText themeColor="textSecondary" type="small">
            Selected
          </ThemedText>
        )}
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false}>
        {categories.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            onLongPress={() => confirmDelete(cat)}
            style={[styles.row, selectedId === cat.id && styles.selectedRow]}
          >
            <ThemedText
              style={selectedId === cat.id ? styles.selectedText : styles.rowText}
            >
              {cat.name}
            </ThemedText>
            {selectedId === cat.id && (
              <ThemedText themeColor="textSecondary" type="small">
                Selected
              </ThemedText>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {showAdd ? (
        <ThemedView style={styles.addRow}>
          <TextInput
            style={[styles.addInput, { color: theme.text, borderColor: theme.textSecondary }]}
            placeholder="Category name"
            placeholderTextColor={theme.textSecondary}
            value={newName}
            onChangeText={setNewName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
          <Pressable onPress={handleAdd} style={styles.addBtn}>
            <ThemedText style={styles.addBtnText}>Add</ThemedText>
          </Pressable>
          <Pressable onPress={() => setShowAdd(false)} style={styles.cancelSmall}>
            <ThemedText type="small" themeColor="textSecondary">Cancel</ThemedText>
          </Pressable>
        </ThemedView>
      ) : (
        <Pressable onPress={() => setShowAdd(true)} style={styles.newCategoryRow}>
          <ThemedText themeColor="textSecondary">+ New category</ThemedText>
        </Pressable>
      )}
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
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeBtn: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  selectedRow: {
    backgroundColor: 'rgba(60, 135, 247, 0.12)',
  },
  selectedText: {
    fontWeight: '600',
    fontSize: 16,
    color: '#3c87f7',
  },
  rowText: {
    fontSize: 16,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
  },
  addInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  addBtn: {
    backgroundColor: '#3c87f7',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelSmall: {
    paddingVertical: Spacing.two,
  },
  newCategoryRow: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
});
