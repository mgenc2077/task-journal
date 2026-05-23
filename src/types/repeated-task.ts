export interface RepeatedTask {
  id: string;
  title: string;
  default_notes: string;
  category_id: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export type NewRepeatedTask = Pick<RepeatedTask, 'title' | 'default_notes' | 'category_id'>;
export type RepeatedTaskUpdate = Pick<RepeatedTask, 'title' | 'default_notes' | 'category_id'>;
