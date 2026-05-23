import type { SQLiteDatabase } from 'expo-sqlite';

import type { NewRepeatedTask, RepeatedTask, RepeatedTaskUpdate } from '@/types/repeated-task';
import type { Task } from '@/types/task';
import { generateUUIDv7 } from '@/utils/uuid';

export async function getRepeatedTasks(
  db: SQLiteDatabase,
): Promise<RepeatedTask[]> {
  return db.getAllAsync<RepeatedTask>(
    'SELECT * FROM repeated_tasks WHERE deleted_at IS NULL ORDER BY title ASC',
  );
}

export async function createRepeatedTask(
  db: SQLiteDatabase,
  input: NewRepeatedTask,
): Promise<void> {
  const now = Date.now();
  await db.runAsync(
    'INSERT INTO repeated_tasks (id, title, default_notes, category_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    generateUUIDv7(),
    input.title,
    input.default_notes,
    input.category_id,
    now,
    now,
  );
}

export async function updateRepeatedTask(
  db: SQLiteDatabase,
  id: string,
  input: RepeatedTaskUpdate,
): Promise<void> {
  await db.runAsync(
    'UPDATE repeated_tasks SET title = ?, default_notes = ?, category_id = ?, updated_at = ? WHERE id = ?',
    input.title,
    input.default_notes,
    input.category_id,
    Date.now(),
    id,
  );
}

export async function deleteRepeatedTask(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  const now = Date.now();
  await db.runAsync(
    'UPDATE repeated_tasks SET deleted_at = ?, updated_at = ? WHERE id = ?',
    now,
    now,
    id,
  );
}

export async function getRepeatedTaskLastUsed(
  db: SQLiteDatabase,
  title: string,
): Promise<string | null> {
  const result = await db.getFirstAsync<{ date: string }>(
    'SELECT MAX(date) as date FROM tasks WHERE title = ? AND deleted_at IS NULL',
    title,
  );
  return result?.date ?? null;
}

export async function getRepeatedTaskHistory(
  db: SQLiteDatabase,
  title: string,
): Promise<Task[]> {
  return db.getAllAsync<Task>(
    "SELECT * FROM tasks WHERE title = ? AND deleted_at IS NULL ORDER BY date DESC, created_at DESC",
    title,
  );
}

export async function getRepeatedTasksSince(
  db: SQLiteDatabase,
  sinceMs: number,
): Promise<RepeatedTask[]> {
  return db.getAllAsync<RepeatedTask>(
    'SELECT * FROM repeated_tasks WHERE updated_at > ? ORDER BY updated_at',
    sinceMs,
  );
}

export async function upsertRepeatedTask(
  db: SQLiteDatabase,
  rt: RepeatedTask,
): Promise<void> {
  const existing = await db.getFirstAsync<RepeatedTask>(
    'SELECT * FROM repeated_tasks WHERE id = ?',
    rt.id,
  );
  if (existing && existing.updated_at >= rt.updated_at) {
    return;
  }
  await db.runAsync(
    'INSERT OR REPLACE INTO repeated_tasks (id, title, default_notes, category_id, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    rt.id,
    rt.title,
    rt.default_notes,
    rt.category_id,
    rt.created_at,
    rt.updated_at,
    rt.deleted_at,
  );
}
