import type { SQLiteDatabase } from 'expo-sqlite';

import type { Category, NewCategory } from '@/types/category';
import { generateUUIDv7 } from '@/utils/uuid';

export async function getCategories(
  db: SQLiteDatabase,
): Promise<Category[]> {
  return db.getAllAsync<Category>(
    'SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY name ASC',
  );
}

export async function createCategory(
  db: SQLiteDatabase,
  input: NewCategory,
): Promise<string> {
  const id = generateUUIDv7();
  const now = Date.now();
  await db.runAsync(
    'INSERT INTO categories (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
    id,
    input.name,
    now,
    now,
  );
  return id;
}

export async function updateCategory(
  db: SQLiteDatabase,
  id: string,
  input: NewCategory,
): Promise<void> {
  await db.runAsync(
    'UPDATE categories SET name = ?, updated_at = ? WHERE id = ?',
    input.name,
    Date.now(),
    id,
  );
}

export async function deleteCategory(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  const now = Date.now();
  await db.runAsync(
    'UPDATE repeated_tasks SET category_id = NULL, updated_at = ? WHERE category_id = ?',
    now,
    id,
  );
  await db.runAsync(
    'UPDATE categories SET deleted_at = ?, updated_at = ? WHERE id = ?',
    now,
    now,
    id,
  );
}

export async function getCategoriesSince(
  db: SQLiteDatabase,
  sinceMs: number,
): Promise<Category[]> {
  return db.getAllAsync<Category>(
    'SELECT * FROM categories WHERE updated_at > ? ORDER BY updated_at',
    sinceMs,
  );
}

export async function upsertCategory(
  db: SQLiteDatabase,
  cat: Category,
): Promise<void> {
  const existing = await db.getFirstAsync<Category>(
    'SELECT * FROM categories WHERE id = ?',
    cat.id,
  );
  if (existing && existing.updated_at >= cat.updated_at) {
    return;
  }
  await db.runAsync(
    'INSERT OR REPLACE INTO categories (id, name, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?)',
    cat.id,
    cat.name,
    cat.created_at,
    cat.updated_at,
    cat.deleted_at,
  );
}
