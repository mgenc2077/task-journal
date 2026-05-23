import type { SQLiteDatabase } from 'expo-sqlite';

export async function getSyncUrl(db: SQLiteDatabase): Promise<string> {
  const result = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'sync_url'",
  );
  return result?.value ?? '';
}

export async function setSyncUrl(
  db: SQLiteDatabase,
  url: string,
): Promise<void> {
  await db.runAsync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('sync_url', ?)",
    url,
  );
}

export async function getLastSyncAt(db: SQLiteDatabase): Promise<number> {
  const result = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM sync_meta WHERE key = 'last_sync_at'",
  );
  return result?.value ? parseInt(result.value, 10) : 0;
}

export async function setLastSyncAt(
  db: SQLiteDatabase,
  ms: number,
): Promise<void> {
  await db.runAsync(
    "INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_sync_at', ?)",
    String(ms),
  );
}
