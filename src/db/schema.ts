import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 4;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  const currentDbVersion = result?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        title TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
    `);
  }

  if (currentDbVersion < 2) {
    await db.runAsync(
      'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
    );
    await db.runAsync(
      "INSERT OR IGNORE INTO settings (key, value) VALUES ('first_day_of_week', 'sunday')",
    );
  }

  if (currentDbVersion < 3) {
    await db.runAsync(
      `CREATE TABLE IF NOT EXISTS repeated_tasks (
        id INTEGER PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        default_notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    );
  }

  if (currentDbVersion < 4) {
    await db.runAsync(
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    );
    await db.runAsync(
      'ALTER TABLE repeated_tasks ADD COLUMN category_id INTEGER REFERENCES categories(id)',
    );
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
