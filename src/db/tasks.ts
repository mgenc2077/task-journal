import type { SQLiteDatabase } from 'expo-sqlite';

import type { NewTask, Task, TaskUpdate } from '@/types/task';

export async function getTasksByDate(
  db: SQLiteDatabase,
  date: string,
): Promise<Task[]> {
  return db.getAllAsync<Task>(
    'SELECT * FROM tasks WHERE date = ? ORDER BY created_at ASC',
    date,
  );
}

export async function getDatesWithTasks(
  db: SQLiteDatabase,
  yearMonth: string,
): Promise<string[]> {
  const rows = await db.getAllAsync<{ date: string }>(
    "SELECT DISTINCT date FROM tasks WHERE date LIKE ? || '%' ORDER BY date ASC",
    yearMonth,
  );
  return rows.map((r) => r.date);
}

export async function getAllTasksGrouped(
  db: SQLiteDatabase,
): Promise<{ date: string; tasks: Task[] }[]> {
  const tasks = await db.getAllAsync<Task>(
    'SELECT * FROM tasks ORDER BY date DESC, created_at ASC',
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
  await db.runAsync(
    'INSERT INTO tasks (date, title, notes) VALUES (?, ?, ?)',
    input.date,
    input.title,
    input.notes,
  );
}

export async function updateTask(
  db: SQLiteDatabase,
  id: number,
  input: TaskUpdate,
): Promise<void> {
  await db.runAsync(
    "UPDATE tasks SET title = ?, notes = ?, updated_at = datetime('now') WHERE id = ?",
    input.title,
    input.notes,
    id,
  );
}

export async function deleteTask(
  db: SQLiteDatabase,
  id: number,
): Promise<void> {
  await db.runAsync('DELETE FROM tasks WHERE id = ?', id);
}
