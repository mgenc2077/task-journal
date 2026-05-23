import type { SQLiteDatabase } from 'expo-sqlite';

import type { NewTask, Task, TaskUpdate } from '@/types/task';
import { generateUUIDv7 } from '@/utils/uuid';

export async function getTasksByDate(
  db: SQLiteDatabase,
  date: string,
): Promise<Task[]> {
  return db.getAllAsync<Task>(
    'SELECT * FROM tasks WHERE date = ? AND deleted_at IS NULL ORDER BY created_at ASC',
    date,
  );
}

export async function getDatesWithTasks(
  db: SQLiteDatabase,
  yearMonth: string,
): Promise<string[]> {
  const rows = await db.getAllAsync<{ date: string }>(
    "SELECT DISTINCT date FROM tasks WHERE date LIKE ? || '%' AND deleted_at IS NULL ORDER BY date ASC",
    yearMonth,
  );
  return rows.map((r) => r.date);
}

export async function getTasksByMonth(
  db: SQLiteDatabase,
  yearMonth: string,
): Promise<Record<string, Task[]>> {
  const tasks = await db.getAllAsync<Task>(
    "SELECT * FROM tasks WHERE date LIKE ? || '%' AND deleted_at IS NULL ORDER BY date ASC, created_at ASC",
    yearMonth,
  );
  const grouped: Record<string, Task[]> = {};
  for (const task of tasks) {
    if (!grouped[task.date]) {
      grouped[task.date] = [];
    }
    grouped[task.date].push(task);
  }
  return grouped;
}

export async function getAllTasksGrouped(
  db: SQLiteDatabase,
): Promise<{ date: string; tasks: Task[] }[]> {
  const tasks = await db.getAllAsync<Task>(
    'SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY date DESC, created_at ASC',
  );
  const grouped: Record<string, Task[]> = {};
  for (const task of tasks) {
    if (!grouped[task.date]) {
      grouped[task.date] = [];
    }
    grouped[task.date].push(task);
  }
  return Object.entries(grouped)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, tasks]) => ({ date, tasks }));
}

export async function createTask(
  db: SQLiteDatabase,
  input: NewTask,
): Promise<void> {
  const now = Date.now();
  await db.runAsync(
    'INSERT INTO tasks (id, date, title, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    generateUUIDv7(),
    input.date,
    input.title,
    input.notes,
    now,
    now,
  );
}

export async function updateTask(
  db: SQLiteDatabase,
  id: string,
  input: TaskUpdate,
): Promise<void> {
  await db.runAsync(
    'UPDATE tasks SET title = ?, notes = ?, updated_at = ? WHERE id = ?',
    input.title,
    input.notes,
    Date.now(),
    id,
  );
}

export async function deleteTask(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  const now = Date.now();
  await db.runAsync(
    'UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?',
    now,
    now,
    id,
  );
}

export async function getTasksSince(
  db: SQLiteDatabase,
  sinceMs: number,
): Promise<Task[]> {
  return db.getAllAsync<Task>(
    'SELECT * FROM tasks WHERE updated_at > ? ORDER BY updated_at',
    sinceMs,
  );
}

export async function upsertTask(
  db: SQLiteDatabase,
  task: Task,
): Promise<void> {
  const existing = await db.getFirstAsync<Task>(
    'SELECT * FROM tasks WHERE id = ?',
    task.id,
  );
  if (existing && existing.updated_at >= task.updated_at) {
    return;
  }
  await db.runAsync(
    'INSERT OR REPLACE INTO tasks (id, date, title, notes, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    task.id,
    task.date,
    task.title,
    task.notes,
    task.created_at,
    task.updated_at,
    task.deleted_at,
  );
}
