import type { SQLiteDatabase } from 'expo-sqlite';

import { getCategoriesSince, upsertCategory } from '@/db/categories';
import { getRepeatedTasksSince, upsertRepeatedTask } from '@/db/repeated-tasks';
import {
  getLastSyncAt,
  setLastSyncAt,
} from '@/db/sync-settings';
import { getTasksSince, upsertTask } from '@/db/tasks';
import type { Category } from '@/types/category';
import type { RepeatedTask } from '@/types/repeated-task';
import type { Task } from '@/types/task';

interface SyncRequest {
  last_sync_at: number;
  tasks: Task[];
  repeated_tasks: RepeatedTask[];
  categories: Category[];
}

interface SyncResponse {
  synced_at: number;
  tasks: Task[];
  repeated_tasks: RepeatedTask[];
  categories: Category[];
}

export interface SyncResult {
  success: boolean;
  syncedAt: number | null;
  error: string | null;
}

export async function performSync(
  db: SQLiteDatabase,
  serverUrl: string,
): Promise<SyncResult> {
  const trimmedUrl = serverUrl.trim().replace(/\/+$/, '');

  if (trimmedUrl.length === 0) {
    return { success: false, syncedAt: null, error: 'No server URL configured' };
  }

  try {
    const lastSyncAt = await getLastSyncAt(db);

    const [tasks, repeatedTasks, categories] = await Promise.all([
      getTasksSince(db, lastSyncAt),
      getRepeatedTasksSince(db, lastSyncAt),
      getCategoriesSince(db, lastSyncAt),
    ]);

    const body: SyncRequest = {
      last_sync_at: lastSyncAt,
      tasks,
      repeated_tasks: repeatedTasks,
      categories,
    };

    const response = await fetch(`${trimmedUrl}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, syncedAt: null, error: `Server error ${response.status}: ${text}` };
    }

    const data: SyncResponse = await response.json();

    for (const t of data.tasks) {
      await upsertTask(db, t);
    }
    for (const rt of data.repeated_tasks) {
      await upsertRepeatedTask(db, rt);
    }
    for (const c of data.categories) {
      await upsertCategory(db, c);
    }

    await setLastSyncAt(db, data.synced_at);

    return { success: true, syncedAt: data.synced_at, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, syncedAt: null, error: message };
  }
}
