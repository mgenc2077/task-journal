import type { SQLiteDatabase } from 'expo-sqlite';

import type { Category, NewCategory } from '@/types/category';

export async function getCategories(
  db: SQLiteDatabase,
): Promise<Category[]> {
  return db.getAllAsync<Category>(
    'SELECT * FROM categories ORDER BY name ASC',
  );
}

export async function createCategory(
  db: SQLiteDatabase,
  input: NewCategory,
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO categories (name) VALUES (?)',
    input.name,
  );
  return result.lastInsertRowId;
}

export async function updateCategory(
  db: SQLiteDatabase,
  id: number,
  input: NewCategory,
): Promise<void> {
  await db.runAsync(
    "UPDATE categories SET name = ?, updated_at = datetime('now') WHERE id = ?",
    input.name,
    id,
  );
}

export async function deleteCategory(
  db: SQLiteDatabase,
  id: number,
): Promise<void> {
  await db.runAsync(
    'UPDATE repeated_tasks SET category_id = NULL WHERE category_id = ?',
    id,
  );
  await db.runAsync('DELETE FROM categories WHERE id = ?', id);
}
