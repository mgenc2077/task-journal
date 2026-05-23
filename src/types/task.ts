export interface Task {
  id: string;
  date: string;
  title: string;
  notes: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export type NewTask = Pick<Task, 'date' | 'title' | 'notes'>;
export type TaskUpdate = Pick<Task, 'title' | 'notes'>;
