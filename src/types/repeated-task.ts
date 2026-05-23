export interface RepeatedTask {
  id: number;
  title: string;
  default_notes: string;
  category_id: number | null;
  created_at: string;
  updated_at: string;
}

export type NewRepeatedTask = Pick<RepeatedTask, 'title' | 'default_notes' | 'category_id'>;
export type RepeatedTaskUpdate = Pick<RepeatedTask, 'title' | 'default_notes' | 'category_id'>;
