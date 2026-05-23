import type { SQLiteDatabase } from 'expo-sqlite';

import type { NewRepeatedTask, RepeatedTask, RepeatedTaskUpdate } from '@/types/repeated-task';
import type { Task } from '@/types/task';

export async function getRepeatedTasks(
  db: SQLiteDatabase,
): Promise<RepeatedTask[]> {
  return db.getAllAsync<RepeatedTask>(
    'SELECT * FROM repeated_tasks ORDER BY title ASC',
  );
}

export async function createRepeatedTask(
  db: SQLiteDatabase,
  input: NewRepeatedTask,
): Promise<void> {
  await db.runAsync(
    'INSERT INTO repeated_tasks (title, default_notes, category_id) VALUES (?, ?, ?)',
    input.title,
    input.default_notes,
    input.category_id,
  );
}

export async function updateRepeatedTask(
  db: SQLiteDatabase,
  id: number,
  input: RepeatedTaskUpdate,
): Promise<void> {
  await db.runAsync(
    "UPDATE repeated_tasks SET title = ?, default_notes = ?, category_id = ?, updated_at = datetime('now') WHERE id = ?",
    input.title,
    input.default_notes,
    input.category_id,
    id,
  );
}

export async function deleteRepeatedTask(
  db: SQLiteDatabase,
  id: number,
): Promise<void> {
  await db.runAsync('DELETE FROM repeated_tasks WHERE id = ?', id);
}

export async function getRepeatedTaskLastUsed(
  db: SQLiteDatabase,
  title: string,
): Promise<string | null> {
  const result = await db.getFirstAsync<{ date: string }>(
    'SELECT MAX(date) as date FROM tasks WHERE title = ?',
    title,
  );
  return result?.date ?? null;
}

export async function getRepeatedTaskHistory(
  db: SQLiteDatabase,
  title: string,
): Promise<Task[]> {
  return db.getAllAsync<Task>(
    "SELECT * FROM tasks WHERE title = ? ORDER BY date DESC, created_at DESC",
    title,
  );
}
