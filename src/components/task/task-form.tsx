import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface TaskFormProps {
  initialTitle?: string;
  initialNotes?: string;
  onSave: (data: { title: string; notes: string }) => void;
  onCancel: () => void;
}

export function TaskForm({
  initialTitle = '',
  initialNotes = '',
  onSave,
  onCancel,
}: TaskFormProps) {
  const theme = useTheme();
  const [title, setTitle] = useState(initialTitle);
  const [notes, setNotes] = useState(initialNotes);

  function handleSave() {
    const trimmed = title.trim();
    if (trimmed.length === 0) return;
    onSave({ title: trimmed, notes: notes.trim() });
  }

  return (
    <ThemedView style={styles.container}>
      <TextInput
        style={[styles.input, { color: theme.text }]}
        placeholder="Task title"
        placeholderTextColor={theme.textSecondary}
        value={title}
        onChangeText={setTitle}
        autoFocus
        returnKeyType="next"
      />
      <TextInput
        style={[
          styles.input,
          styles.notesInput,
          { color: theme.text },
        ]}
        placeholder="Notes (optional)"
        placeholderTextColor={theme.textSecondary}
        value={notes}
        onChangeText={setNotes}
        multiline
      />
      <ThemedView style={styles.actions}>
        <Pressable onPress={onCancel} style={styles.button}>
          <ThemedText type="link">Cancel</ThemedText>
        </Pressable>
        <Pressable
          onPress={handleSave}
          style={[styles.button, styles.saveButton]}
        >
          <ThemedText style={styles.saveText}>Save</ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
  },
  button: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  saveButton: {
    backgroundColor: '#3c87f7',
  },
  saveText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
