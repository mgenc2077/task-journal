export interface Task {
  id: number;
  date: string;
  title: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type NewTask = Pick<Task, 'date' | 'title' | 'notes'>;
export type TaskUpdate = Pick<Task, 'title' | 'notes'>;
